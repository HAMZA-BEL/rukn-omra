import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DEFAULT_AGENCY } from "../data/initialData";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import { db } from "../lib/db";
import { fetchRecentActivity } from "../services/activityService";
import { fetchNotifications } from "../services/notificationsService";
import {
  deletePayment as deletePaymentRemote,
  fetchPayments,
  savePayment,
} from "../services/paymentsService";
import {
  fetchClients,
  saveClient,
  deleteClient as deleteClientRemote,
} from "../services/clientsService";
import {
  fetchPrograms,
  saveProgram,
  deleteProgram as deleteProgramRemote,
} from "../services/programsService";
import { useNotificationsSlice } from "./useNotificationsSlice";
import { useActivitySlice } from "./useActivitySlice";
import { usePaymentsSlice } from "./usePaymentsSlice";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  let timestamp = Date.now();
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    timestamp += performance.now();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (timestamp + Math.random() * 16) % 16 | 0;
    timestamp = Math.floor(timestamp / 16);
    if (char === "x") return rand.toString(16);
    return ((rand & 0x3) | 0x8).toString(16);
  });
};

const isUUID = (value) => typeof value === "string" && UUID_REGEX.test(value);

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const buildDisplayName = (data) => {
  const first = trimString(data.firstName);
  const last  = trimString(data.lastName);
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last)  return last;
  return trimString(data.name) || "";
};

const sanitizePassport = (passport = {}) => ({
  number:      trimString(passport.number || ""),
  nationality: trimString(passport.nationality || "") || "MAR",
  birthDate:   trimString(passport.birthDate || ""),
  expiry:      trimString(passport.expiry || ""),
  gender:      trimString(passport.gender || "") || "M",
  issueDate:   trimString(passport.issueDate || ""),
});

const sanitizeDocs = (docs = {}) => ({
  passportCopy: Boolean(docs.passportCopy),
  photo:        Boolean(docs.photo),
  vaccine:      Boolean(docs.vaccine),
  contract:     Boolean(docs.contract),
});

const getNotificationKey = (type, programId) => `${type}:${programId || "none"}`;

const prepareClientForSave = (data) => {
  const cleaned = {
    ...data,
    firstName: trimString(data.firstName),
    lastName:  trimString(data.lastName),
    nom:       trimString(data.nom),
    prenom:    trimString(data.prenom),
    phone:     trimString(data.phone),
    city:      trimString(data.city),
    ticketNo:  trimString(data.ticketNo),
    notes:     typeof data.notes === "string" ? data.notes.trim() : data.notes ?? "",
    passport:  sanitizePassport(data.passport),
    docs:      sanitizeDocs(data.docs),
  };
  cleaned.name = buildDisplayName(cleaned);
  return cleaned;
};

const migrateLegacyIds = (programs = [], clients = [], payments = []) => {
  const safePrograms = Array.isArray(programs) ? programs : [];
  const safeClients  = Array.isArray(clients)  ? clients  : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const programMap = new Map();
  const clientMap  = new Map();

  let programsChanged = false;
  let clientsChanged  = false;
  let paymentsChanged = false;
  const programsToSync = [];
  const clientsToSync  = [];
  const paymentsToSync = [];

  const normalizedPrograms = safePrograms.map((program) => {
    if (isUUID(program.id)) return program;
    const newId = generateUUID();
    programMap.set(program.id, newId);
    programsChanged = true;
    const updated = { ...program, id: newId };
    programsToSync.push(updated);
    return updated;
  });

  const normalizedClients = safeClients.map((client) => {
    let next    = client;
    let mutated = false;
    if (!isUUID(client.id)) {
      const newId = generateUUID();
      clientMap.set(client.id, newId);
      next    = { ...next, id: newId };
      mutated = true;
    }
    if (client.programId && programMap.has(client.programId)) {
      if (!mutated) next = { ...next };
      next.programId = programMap.get(client.programId);
      mutated = true;
    }
    if (mutated) clientsChanged = true;
    if (mutated) clientsToSync.push(next);
    return mutated ? next : client;
  });

  const normalizedPayments = safePayments.map((payment) => {
    let next    = payment;
    let mutated = false;
    if (!isUUID(payment.id)) {
      next    = { ...next, id: generateUUID() };
      mutated = true;
    }
    if (payment.clientId && clientMap.has(payment.clientId)) {
      if (!mutated) next = { ...next };
      next.clientId = clientMap.get(payment.clientId);
      mutated = true;
    }
    if (mutated) paymentsChanged = true;
    if (mutated) paymentsToSync.push(next);
    return mutated ? next : payment;
  });

  return {
    programs: normalizedPrograms,
    clients: normalizedClients,
    payments: normalizedPayments,
    programsChanged,
    clientsChanged,
    paymentsChanged,
    programsToSync,
    clientsToSync,
    paymentsToSync,
  };
};

// ── localStorage helper ───────────────────────────────────────────────────────
function useLS(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {
      console.warn("[useLS] Failed to write localStorage:", key, e);
    }
  }, [key, val]);
  return [val, setVal];
}

// ── Stable UUID generation ────────────────────────────────────────────────────
function genId() {
  return generateUUID();
}

// ── Main store ────────────────────────────────────────────────────────────────
// agencyId: null means local-only mode (no Supabase auth).
export function useStore(agencyId, onToast) {
  // Namespace localStorage keys per agency so each agency's cache is isolated.
  const ns = agencyId || "local";

  const [programs,    setPrograms]    = useState([]);
  const [clients,     setClients]     = useState([]);
  const [agency,        setAgency]        = useLS(`umrah_agency_v4_${ns}`,    DEFAULT_AGENCY);
  const {
    activityLog,
    setInitialActivity,
    fetchActivityLogPage,
    archiveActivityLog,
    logActivity,
  } = useActivitySlice({ agencyId, isSupabaseEnabled, generateUUID });
  const {
    notifications,
    unreadNotifications,
    unreadNotificationsCount,
    setInitialNotifications,
    handleRealtimeUpsert,
    handleRealtimeDelete,
    markNotificationRead,
    markAllNotificationsRead,
    archiveNotification,
    restoreNotification,
    ensureNotificationExists,
  } = useNotificationsSlice({ agencyId, isSupabaseEnabled, generateUUID, getNotificationKey });
  const {
    payments,
    setInitialPayments,
    replacePayments,
    handleRealtimeUpsert: handlePaymentRealtimeUpsert,
    handleRealtimeDelete: handlePaymentRealtimeDelete,
    addPaymentLocal,
    removePaymentLocal,
    removePaymentsByClient,
    getClientPayments,
    getClientTotalPaid,
    getClientLastPayment,
  } = usePaymentsSlice();

  const [dbLoading,   setDbLoading]   = useState(false);
  // syncStatus: 'synced' | 'syncing' | 'offline'
  const [syncStatus,  setSyncStatus]  = useState("synced");
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [lastSynced,  setLastSynced]  = useState(() => {
    try {
      const s = localStorage.getItem(`umrah_last_synced_${ns}`);
      return s ? new Date(s) : null;
    } catch { return null; }
  });

  // Prevent double-fetch in React StrictMode
  const fetchedRef = useRef(false);

  const notify = useCallback((msg, type = "error") => {
    if (onToast) onToast(msg, type);
    else console.warn("[Store]", msg);
  }, [onToast]);

  // ── Archived / Active split ───────────────────────────────────────────────
  const archivedClients      = useMemo(() => clients.filter(c => !!c.archived),  [clients]);
  const activeClients        = useMemo(() => clients.filter(c => !c.archived),   [clients]);
  const archiveOldActivityLog = useCallback((days = 180) => archiveActivityLog(days), [archiveActivityLog]);

  // ── Silent background sync: local-first, Supabase async ──────────────────
  const sync = useCallback(async (fn) => {
    if (!isSupabaseEnabled || !agencyId) return;
    setSyncStatus("syncing");
    try {
      const result = await fn();
      const error  = result?.error;
      if (error) {
        console.error("[Store] Supabase sync error:", error);
        throw error;
      }
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    } catch (err) {
      console.error("[Store] Sync request failed:", err);
      setSyncStatus("offline");
    }
  }, [agencyId, ns]);

  // ── Legacy ID migration (ensures Supabase-compatible UUIDs) ───────────────
  useEffect(() => {
    const {
      programs: normalizedPrograms,
      clients: normalizedClients,
      payments: normalizedPayments,
      programsChanged,
      clientsChanged,
      paymentsChanged,
      programsToSync,
      clientsToSync,
      paymentsToSync,
    } = migrateLegacyIds(programs, clients, payments);
    if (!programsChanged && !clientsChanged && !paymentsChanged) return;
    if (programsChanged) setPrograms(normalizedPrograms);
    if (clientsChanged)  setClients(normalizedClients);
    if (paymentsChanged) replacePayments(normalizedPayments);
    if (!isSupabaseEnabled || !agencyId) return;
    if (!programsToSync.length && !clientsToSync.length && !paymentsToSync.length) return;
    sync(async () => {
      const upsertSeq = async (records, handler) => {
        for (const record of records) {
          const { error } = await handler(record, agencyId);
          if (error) return error;
        }
        return null;
      };
      let error = await upsertSeq(programsToSync, (record, agency) => saveProgram(record, agency));
      if (error) return { error };
      error = await upsertSeq(clientsToSync, (record, agency) => saveClient(record, agency));
      if (error) return { error };
      error = await upsertSeq(paymentsToSync, (record, agency) => savePayment(record, agency));
      return { error };
    });
  }, [programs, clients, payments, setPrograms, setClients, replacePayments, isSupabaseEnabled, agencyId, sync]);

  // ── Initial fetch from Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId || fetchedRef.current) return;
    fetchedRef.current = true;
    setDbLoading(true);

    Promise.all([
      fetchPrograms(agencyId),
      fetchClients(agencyId),
      fetchPayments(agencyId),
      db.agency.fetch(agencyId),
      fetchNotifications(agencyId),
      fetchRecentActivity(agencyId, 5),
    ]).then(([p, c, pay, ag, notif, act]) => {
      if (!p.error   && p.data)   setPrograms(p.data);
      if (!c.error   && c.data)   setClients(c.data);
      if (!pay.error && pay.data) setInitialPayments(pay.data);
      if (!ag.error  && ag.data)  setAgency(prev => ({ ...prev, ...ag.data }));
      if (!notif.error && notif.data) setInitialNotifications(notif.data);
      if (!act.error && act.data) setInitialActivity(act.data);
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    }).catch((err) => {
      console.error("[Store] Initial Supabase fetch failed:", err);
      setSyncStatus("offline");
      notify("يعمل النظام بالوضع المحلي — تعذّر الاتصال بالسحابة");
    }).finally(() => {
      setDbLoading(false);
      setStoreHydrated(true);
    });
  }, [agencyId, ns, notify]); 

  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId) {
      setStoreHydrated(true);
    }
  }, [agencyId]);

  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId) return;
    const key = `umrah_activity_archive_last_${ns}`;
    let lastRun = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) lastRun = new Date(raw);
    } catch { lastRun = null; }
    const now = new Date();
    const elapsed = lastRun ? now - lastRun : Number.POSITIVE_INFINITY;
    if (elapsed < 24 * 60 * 60 * 1000) return;
    archiveOldActivityLog().finally(() => {
      try { localStorage.setItem(key, now.toISOString()); } catch {}
    });
  }, [archiveOldActivityLog, agencyId, isSupabaseEnabled, ns]);
  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId) return;

    const channel = db.subscribeAll({
      onProgram: ({ eventType, new: row, old }) => {
        // Extra check: ignore rows that don't belong to this agency
        if (row?.agency_id && row.agency_id !== agencyId) return;
        if (eventType === "INSERT" || eventType === "UPDATE")
          setPrograms(prev => {
            const exists = prev.find(p => p.id === row.id);
            const mapped = {
              id: row.id, name: row.name, nameFr: row.name_fr,
              type: row.type, duration: row.duration, departure: row.departure,
              returnDate: row.return_date, transport: row.transport, mealPlan: row.meal_plan,
              seats: row.seats, hotelMecca: row.hotel_mecca, hotelMadina: row.hotel_madina,
              priceTable: row.price_table ?? [], notes: row.notes, status: row.status,
            };
            return exists
              ? prev.map(p => p.id === row.id ? { ...p, ...mapped } : p)
              : [...prev, mapped];
          });
        else if (eventType === "DELETE")
          setPrograms(prev => prev.filter(p => p.id !== old.id));
      },
      onClient: ({ eventType, new: row, old }) => {
        if (row?.agency_id && row.agency_id !== agencyId) return;
        if (eventType === "INSERT" || eventType === "UPDATE")
          setClients(prev => {
            const exists = prev.find(c => c.id === row.id);
            const mapped = {
              id: row.id, programId: row.program_id, name: row.name,
              firstName: row.first_name, lastName: row.last_name,
              nom: row.nom, prenom: row.prenom, phone: row.phone, city: row.city,
              hotelLevel: row.hotel_level, hotelMecca: row.hotel_mecca,
              hotelMadina: row.hotel_madina, roomType: row.room_type,
              officialPrice: Number(row.official_price ?? 0),
              salePrice: Number(row.sale_price ?? 0),
              ticketNo: row.ticket_no, passport: row.passport ?? {},
              docs: row.docs ?? {}, notes: row.notes,
              registrationDate: row.registration_date, lastModified: row.last_modified,
              archived: row.archived ?? false, archivedAt: row.archived_at ?? null,
            };
            return exists
              ? prev.map(c => c.id === row.id ? { ...c, ...mapped } : c)
              : [...prev, mapped];
          });
        else if (eventType === "DELETE")
          setClients(prev => prev.filter(c => c.id !== old.id));
      },
      onPayment: ({ eventType, new: row, old }) => {
        if (row?.agency_id && row.agency_id !== agencyId) return;
        if (eventType === "INSERT" || eventType === "UPDATE")
          handlePaymentRealtimeUpsert(row);
        else if (eventType === "DELETE")
          handlePaymentRealtimeDelete(old?.id);
      },
      onNotification: ({ eventType, new: row, old }) => {
        const payload = row || old;
        if (payload?.agency_id && payload.agency_id !== agencyId) return;
        if (eventType === "INSERT" || eventType === "UPDATE") {
          handleRealtimeUpsert(row);
        } else if (eventType === "DELETE") {
          handleRealtimeDelete(old?.id);
        }
      },
    });

    return () => { supabase.removeChannel(channel); };
  }, [agencyId]); 
  // ── Helpers ───────────────────────────────────────────────────────────────
  const getClientStatus = useCallback((client) => {
    const paid  = getClientTotalPaid(client.id);
    const price = client.salePrice ?? client.price ?? 0;
    if (paid === 0)    return "unpaid";
    if (paid >= price) return "cleared";
    return "partial";
  }, [getClientTotalPaid]);
  const getProgramById    = useCallback((id) => programs.find(p => p.id === id), [programs]);
  const getProgramClients = useCallback((id) => clients.filter(c => c.programId === id), [clients]);

  // ── Stats (active clients only) ───────────────────────────────────────────
  const stats = useMemo(() => ({
    totalClients:   activeClients.length,
    archivedCount:  archivedClients.length,
    totalPrograms:  programs.length,
    cleared:        activeClients.filter(c => getClientStatus(c) === "cleared").length,
    partial:        activeClients.filter(c => getClientStatus(c) === "partial").length,
    unpaid:         activeClients.filter(c => getClientStatus(c) === "unpaid").length,
    totalRevenue:   activeClients.reduce((s,c) => s+(c.salePrice??c.price??0), 0),
    totalCollected: activeClients.reduce((s,c) => s+getClientTotalPaid(c.id), 0),
    totalRemaining: activeClients.reduce((s,c) => s+Math.max(0,(c.salePrice??c.price??0)-getClientTotalPaid(c.id)), 0),
    totalDiscount:  activeClients.reduce((s,c) => s+Math.max(0,(c.officialPrice??0)-(c.salePrice??c.officialPrice??0)), 0),
    docsIncomplete: activeClients.filter(c => c.docs && Object.values(c.docs).some(v => !v)).length,
  }), [activeClients, archivedClients, programs, getClientStatus, getClientTotalPaid]);

  // ── Archive suggestions ───────────────────────────────────────────────────
  const getArchiveSuggestions = useCallback(() => {
    const today = new Date();
    return programs
      .map(p => {
        const ret = p.returnDate ? new Date(p.returnDate) : (p.departure ? new Date(p.departure) : null);
        if (!ret) return null;
        const daysAgo = Math.floor((today - ret) / (1000*60*60*24));
        if (daysAgo < 30) return null;
        const active = activeClients.filter(c => c.programId === p.id);
        if (active.length === 0) return null;
        return { program: p, daysAgo, count: active.length };
      })
      .filter(Boolean);
  }, [programs, activeClients]);

  useEffect(() => {
    if (!storeHydrated || !isSupabaseEnabled || !agencyId) return;
    const activeKeys = new Set();
    const today = new Date();
    const track = (notif) => {
      const key = getNotificationKey(notif.type, notif.programId);
      activeKeys.add(key);
      ensureNotificationExists(notif);
    };

    programs.forEach((program) => {
      const seats = typeof program.seats === "number" ? program.seats : 0;
      const assigned = activeClients.filter(c => c.programId === program.id);
      const seatsLeft = seats - assigned.length;
      if (seats > 0 && seatsLeft <= 5 && seatsLeft > 0) {
        track({
          type: "system:seat_low",
          title: program.name,
          message: `${seatsLeft} seats remaining`,
          severity: "warn",
          programId: program.id,
        });
      }
      if (seats > 0 && seatsLeft <= 0) {
        track({
          type: "system:seat_full",
          title: program.name,
          message: "Program is full",
          severity: "critical",
          programId: program.id,
        });
      }
      if (program.departure) {
        const depDate = new Date(program.departure);
        if (!Number.isNaN(depDate.getTime())) {
          const daysLeft = Math.ceil((depDate - today) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 7) {
            const unsettled = assigned.filter(c => getClientStatus(c) !== "cleared");
            if (unsettled.length > 0) {
              track({
                type: "system:unsettled",
                title: program.name,
                message: `${unsettled.length} clients not cleared before departure`,
                severity: "critical",
                programId: program.id,
              });
            }
          }
        }
      }
    });

    getArchiveSuggestions().forEach(({ program, daysAgo, count }) => {
      track({
        type: "system:archive_due",
        title: program.name,
        message: `Program ended ${daysAgo} days ago — ${count} active pilgrims`,
        severity: "info",
        programId: program.id,
      });
    });

    notifications.forEach((notif) => {
      if (notif.isArchived) return;
      if (!notif.type || !notif.type.startsWith("system:")) return;
      const key = getNotificationKey(notif.type, notif.programId);
      if (!activeKeys.has(key)) {
        archiveNotification(notif.id, { silent: true });
      }
    });
  }, [
    agencyId,
    programs,
    activeClients,
    getClientStatus,
    getArchiveSuggestions,
    notifications,
    ensureNotificationExists,
    archiveNotification,
    storeHydrated,
    isSupabaseEnabled,
  ]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addClient = useCallback((data) => {
    const id  = genId("CL");
    const now = new Date().toISOString().split("T")[0];
    const prepared = prepareClientForSave(data);
    const newClient = {
      ...prepared,
      id,
      registrationDate: now,
      lastModified:     now,
      archived:         false,
      archivedAt:       null,
    };
    setClients(prev => [...prev, newClient]);
    logActivity("client_add", "تم تسجيل معتمر جديد", newClient.name);
    sync(() => saveClient(newClient, agencyId));
    return id;
  }, [setClients, logActivity, sync, agencyId]);

  const updateClient = useCallback((id, data) => {
    const now      = new Date().toISOString().split("T")[0];
    const prepared = prepareClientForSave(data);
    const updated  = { ...prepared, lastModified: now };
    const previous = clients.find(c => c.id === id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    if (previous && previous.programId !== updated.programId) {
      const programName = programs.find(p => p.id === updated.programId)?.name || updated.programId || "";
      logActivity("client_transfer", `تم نقل المعتمر إلى ${programName}`, updated.name || id);
    } else {
      logActivity("client_update", "تم تعديل ملف المعتمر", updated.name || id);
    }
    sync(() => saveClient({ id, ...updated }, agencyId));
  }, [clients, programs, setClients, logActivity, sync, agencyId]);

  const deleteClient = useCallback((id) => {
    const c = clients.find(x => x.id === id);
    setClients(prev  => prev.filter(c => c.id !== id));
    removePaymentsByClient(id);
    logActivity("client_delete", "تم حذف معتمر", c?.name || id);
    sync(() => deleteClientRemote(id, agencyId));
  }, [clients, setClients, removePaymentsByClient, logActivity, sync, agencyId]);

  // ── Archive / Restore ─────────────────────────────────────────────────────
  const archiveClient = useCallback((id) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => c.id === id ? { ...c, archived: true, archivedAt: now } : c));
    const c = clients.find(x => x.id === id);
    logActivity("client_archive", "تم أرشفة المعتمر", c?.name || id);
    sync(() => saveClient({ id, archived: true, archivedAt: now }, agencyId));
  }, [clients, setClients, logActivity, sync, agencyId]);

  const archiveClients = useCallback((ids) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, archived: true, archivedAt: now } : c));
    ids.forEach(id => sync(() => saveClient({ id, archived: true, archivedAt: now }, agencyId)));
    if (ids.length) {
      logActivity("client_bulk_archive", `تمت أرشفة ${ids.length} معتمر`, "");
    }
  }, [setClients, sync, agencyId, logActivity]);

  const restoreClient = useCallback((id) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, archived: false, archivedAt: null } : c));
    const c = clients.find(x => x.id === id);
    logActivity("client_restore", "تمت استعادة المعتمر من الأرشيف", c?.name || id);
    sync(() => saveClient({ id, archived: false, archivedAt: null }, agencyId));
  }, [clients, setClients, logActivity, sync, agencyId]);

  const archiveProgram = useCallback((programId) => {
    const now        = new Date().toISOString();
    const progClients = activeClients.filter(c => c.programId === programId);
    if (progClients.length === 0) return;
    const ids = progClients.map(c => c.id);
    setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, archived: true, archivedAt: now } : c));
    ids.forEach(id => sync(() => saveClient({ id, archived: true, archivedAt: now }, agencyId)));
    const program = programs.find(p => p.id === programId);
    logActivity("program_archive", `تم أرشفة برنامج ${program?.name || programId}`, "");
  }, [activeClients, programs, setClients, logActivity, sync, agencyId]);

  const addPayment = useCallback((data) => {
    const id          = genId("PMT");
    const autoReceipt = "REC-" + id.slice(-6).toUpperCase();
    const pmt = {
      ...data, id,
      receiptNo: data.receiptNo || autoReceipt,
      date:      data.date || new Date().toISOString().split("T")[0],
    };
    addPaymentLocal(pmt);
    const c   = clients.find(x => x.id === data.clientId);
    const now = new Date().toISOString().split("T")[0];
    setClients(prev => prev.map(x => x.id === data.clientId ? { ...x, lastModified: now } : x));
    logActivity(
      "payment_add",
      `دفعة ${data.amount.toLocaleString("ar-MA")} د.م — ${pmt.receiptNo}`,
      c?.name || data.clientId,
      { skipRemote: isSupabaseEnabled }
    );
    sync(() => savePayment(pmt, agencyId));
    return pmt;
  }, [clients, addPaymentLocal, setClients, logActivity, sync, agencyId, isSupabaseEnabled]);

  const deletePayment = useCallback((id) => {
    const p = payments.find(x => x.id === id);
    removePaymentLocal(id);
    logActivity(
      "payment_delete",
      `تم حذف دفعة ${p?.receiptNo || ""}`,
      "",
      { skipRemote: isSupabaseEnabled }
    );
    sync(() => deletePaymentRemote(id, agencyId));
  }, [payments, removePaymentLocal, logActivity, sync, agencyId, isSupabaseEnabled]);

  const addProgram = useCallback((data) => {
    const id  = genId("PRG");
    const prg = { ...data, id, priceTable: data.priceTable || [] };
    setPrograms(prev => [...prev, prg]);
    logActivity("program_add", `تم إضافة برنامج جديد: ${data.name}`, "");
    sync(() => saveProgram(prg, agencyId));
  }, [setPrograms, logActivity, sync, agencyId]);

  const updateProgram = useCallback((id, data) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    logActivity("program_update", `تم تعديل برنامج ${data.name || id}`, "");
    sync(() => saveProgram({ id, ...data }, agencyId));
  }, [setPrograms, logActivity, sync, agencyId]);

  const deleteProgram = useCallback((id) => {
    const prog = programs.find(p => p.id === id);
    setPrograms(prev => prev.filter(p => p.id !== id));
    setClients(prev => prev.map(c => c.programId === id ? { ...c, programId: null } : c));
    logActivity("program_delete", `تم حذف برنامج ${prog?.name || id}`, "");
    sync(() => deleteProgramRemote(id, agencyId));
  }, [programs, setPrograms, setClients, logActivity, sync, agencyId]);

  const updateAgency = useCallback((data) => {
    setAgency(prev => ({ ...prev, ...data }));
    sync(() => db.agency.update(agencyId, { ...agency, ...data }));
  }, [agency, setAgency, sync, agencyId]);

  // ── Force sync: push all local data to Supabase ───────────────────────────
  const forceSync = useCallback(async () => {
    if (!isSupabaseEnabled || !agencyId) return;
    setSyncStatus("syncing");
    try {
      await Promise.all([
        ...programs.map(p => saveProgram(p, agencyId)),
        ...clients.map(c  => saveClient(c, agencyId)),
        ...payments.map(p => savePayment(p, agencyId)),
        db.agency.update(agencyId, agency),
      ]);
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    } catch (err) {
      console.error("[Store] forceSync error:", err);
      setSyncStatus("offline");
    }
  }, [programs, clients, payments, agency, agencyId, ns]);

  // ── Backup ────────────────────────────────────────────────────────────────
  const exportData = () => {
    const data = { programs, clients, payments, agency, exportedAt: new Date().toISOString(), version: 4 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `umrah-backup-${new Date().toLocaleDateString("fr-MA").replace(/\//g, "-")}.json`;
    a.style.display = "none";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importData = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.programs || !data.clients || !data.payments) throw new Error("ملف غير صالح");
        setPrograms(data.programs);
        setClients(data.clients);
        replacePayments(data.payments);
        if (data.agency) setAgency(data.agency);
        logActivity("import_excel", "تم استيراد بيانات من ملف", "");
        res();
      } catch(err) { rej(err); }
    };
    reader.readAsText(file);
  });

  const dbSyncing = syncStatus === "syncing";

  return {
    programs, clients, payments, agency, activityLog, stats,
    activeClients, archivedClients,
    notifications,
    unreadNotifications,
    unreadNotificationsCount,
    dbLoading, dbSyncing, syncStatus, lastSynced, isSupabaseEnabled,
    getClientPayments, getClientTotalPaid, getClientStatus,
    getClientLastPayment, getProgramClients, getProgramById, getArchiveSuggestions,
    addClient, updateClient, deleteClient,
    archiveClient, archiveClients, restoreClient, archiveProgram,
    addPayment, deletePayment,
    addProgram, updateProgram, deleteProgram,
    updateAgency, exportData, importData, forceSync,
    markNotificationRead, markAllNotificationsRead, archiveNotification, restoreNotification,
    ensureNotificationExists,
    fetchActivityLogPage, archiveOldActivityLog, recordActivity: logActivity,
  };
}
