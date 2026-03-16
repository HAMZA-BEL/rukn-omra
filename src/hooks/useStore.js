import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { INITIAL_PROGRAMS, INITIAL_CLIENTS, INITIAL_PAYMENTS, DEFAULT_AGENCY } from "../data/initialData";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import { db } from "../lib/db";

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
function genId(prefix) {
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  return `${prefix}_${uuid}`;
}

// ── Main store ────────────────────────────────────────────────────────────────
// agencyId: null means local-only mode (no Supabase auth).
export function useStore(agencyId, onToast) {
  // Namespace localStorage keys per agency so each agency's cache is isolated.
  const ns = agencyId || "local";

  const [programs,    setPrograms]    = useLS(`umrah_programs_v4_${ns}`,  INITIAL_PROGRAMS);
  const [clients,     setClients]     = useLS(`umrah_clients_v4_${ns}`,   INITIAL_CLIENTS);
  const [payments,    setPayments]    = useLS(`umrah_payments_v4_${ns}`,  INITIAL_PAYMENTS);
  const [agency,      setAgency]      = useLS(`umrah_agency_v4_${ns}`,    DEFAULT_AGENCY);
  const [activityLog, setActivityLog] = useLS(`umrah_activity_v4_${ns}`,  []);

  const [dbLoading,   setDbLoading]   = useState(false);
  // syncStatus: 'synced' | 'syncing' | 'offline'
  const [syncStatus,  setSyncStatus]  = useState("synced");
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
  const archivedClients = useMemo(() => clients.filter(c => !!c.archived),  [clients]);
  const activeClients   = useMemo(() => clients.filter(c => !c.archived),   [clients]);

  // ── Silent background sync: local-first, Supabase async ──────────────────
  const sync = useCallback(async (fn) => {
    if (!isSupabaseEnabled || !agencyId) return;
    setSyncStatus("syncing");
    try {
      const { error } = await fn();
      if (error) throw error;
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }, [agencyId, ns]);

  // ── Initial fetch from Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId || fetchedRef.current) return;
    fetchedRef.current = true;
    setDbLoading(true);

    Promise.all([
      db.programs.fetchAll(agencyId),
      db.clients.fetchAll(agencyId),
      db.payments.fetchAll(agencyId),
      db.agency.fetch(agencyId),
    ]).then(([p, c, pay, ag]) => {
      if (!p.error   && p.data)   setPrograms(p.data);
      if (!c.error   && c.data)   setClients(c.data);
      if (!pay.error && pay.data) setPayments(pay.data);
      if (!ag.error  && ag.data)  setAgency(prev => ({ ...prev, ...ag.data }));
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    }).catch(() => {
      setSyncStatus("offline");
      notify("يعمل النظام بالوضع المحلي — تعذّر الاتصال بالسحابة");
    }).finally(() => {
      setDbLoading(false);
    });
  }, [agencyId, ns, notify]); 
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
          setPayments(prev => {
            const exists = prev.find(p => p.id === row.id);
            const mapped = {
              id: row.id, clientId: row.client_id,
              amount: Number(row.amount), date: row.date,
              method: row.method, receiptNo: row.receipt_no, note: row.note,
            };
            return exists
              ? prev.map(p => p.id === row.id ? { ...p, ...mapped } : p)
              : [...prev, mapped];
          });
        else if (eventType === "DELETE")
          setPayments(prev => prev.filter(p => p.id !== old.id));
      },
    });

    return () => { supabase.removeChannel(channel); };
  }, [agencyId]); 
  // ── Helpers ───────────────────────────────────────────────────────────────
  const getClientPayments    = useCallback((id) => payments.filter(p => p.clientId === id), [payments]);
  const getClientTotalPaid   = useCallback((id) => payments.filter(p => p.clientId === id).reduce((s,p) => s+p.amount, 0), [payments]);
  const getClientLastPayment = useCallback((id) => {
    const cp = payments.filter(p => p.clientId === id).sort((a,b) => new Date(b.date)-new Date(a.date));
    return cp[0] || null;
  }, [payments]);
  const getClientStatus = useCallback((client) => {
    const paid  = getClientTotalPaid(client.id);
    const price = client.salePrice ?? client.price ?? 0;
    if (paid === 0)    return "unpaid";
    if (paid >= price) return "cleared";
    return "partial";
  }, [getClientTotalPaid]);
  const getProgramById    = useCallback((id) => programs.find(p => p.id === id), [programs]);
  const getProgramClients = useCallback((id) => clients.filter(c => c.programId === id), [clients]);

  // ── Activity log ──────────────────────────────────────────────────────────
  const logActivity = useCallback((type, description, clientName = "") => {
    const entry = {
      id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      type, description, clientName, time: new Date().toISOString(),
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 50));
    // Fire-and-forget: sync activity to Supabase
    if (isSupabaseEnabled && agencyId) {
      db.activityLog.insert(agencyId, null, entry).catch(() => {});
    }
  }, [setActivityLog, agencyId]);

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

  // ── Alerts (active clients only) ─────────────────────────────────────────
  const getAlerts = useCallback(() => {
    const list  = [];
    const today = new Date();
    programs.forEach(p => {
      const dep      = new Date(p.departure);
      const daysLeft = Math.ceil((dep - today) / (1000*60*60*24));
      const pc       = activeClients.filter(c => c.programId === p.id);
      const seatsLeft = p.seats - pc.length;
      if (seatsLeft <= 5 && seatsLeft > 0)
        list.push({ type:"warning", icon:"⚠️", msg:`${p.name}: ${seatsLeft} seats left only` });
      if (seatsLeft <= 0)
        list.push({ type:"danger", icon:"🔴", msg:`${p.name}: seats full` });
      if (daysLeft > 0 && daysLeft <= 7) {
        const unsettled = pc.filter(c => getClientStatus(c) !== "cleared");
        if (unsettled.length > 0)
          list.push({ type:"danger", icon:"🚨", msg:`${p.name}: ${unsettled.length} pilgrims not cleared, departure in ${daysLeft} days` });
      }
    });
    return list;
  }, [programs, activeClients, getClientStatus]);

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

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const buildDisplayName = (data) => {
    if (data.firstName && data.lastName) return `${data.firstName} ${data.lastName}`;
    if (data.firstName) return data.firstName;
    if (data.lastName)  return data.lastName;
    return data.name || "";
  };

  const addClient = useCallback((data) => {
    const id  = genId("CL");
    const now = new Date().toISOString().split("T")[0];
    const newClient = {
      ...data, id,
      name:             buildDisplayName(data),
      registrationDate: now,
      lastModified:     now,
      archived:         false,
      archivedAt:       null,
      passport: data.passport || { number:"", nationality:"MAR", birthDate:"", expiry:"", gender:"M", issueDate:"" },
      docs:     data.docs     || { passportCopy:false, photo:false, vaccine:false, contract:false },
    };
    setClients(prev => [...prev, newClient]);
    logActivity("client_add", "تم تسجيل معتمر جديد", newClient.name);
    sync(() => db.clients.upsert(newClient, agencyId));
    return id;
  }, [setClients, logActivity, sync, agencyId]);

  const updateClient = useCallback((id, data) => {
    const now     = new Date().toISOString().split("T")[0];
    const updated = { ...data, name: buildDisplayName(data), lastModified: now };
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    logActivity("client_edit", "تم تعديل ملف المعتمر", updated.name || id);
    sync(() => db.clients.upsert({ id, ...updated }, agencyId));
  }, [setClients, logActivity, sync, agencyId]);

  const deleteClient = useCallback((id) => {
    const c = clients.find(x => x.id === id);
    setClients(prev  => prev.filter(c => c.id !== id));
    setPayments(prev => prev.filter(p => p.clientId !== id));
    logActivity("client_del", "تم حذف معتمر", c?.name || id);
    sync(() => db.clients.delete(id, agencyId));
  }, [clients, setClients, setPayments, logActivity, sync, agencyId]);

  // ── Archive / Restore ─────────────────────────────────────────────────────
  const archiveClient = useCallback((id) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => c.id === id ? { ...c, archived: true, archivedAt: now } : c));
    const c = clients.find(x => x.id === id);
    logActivity("client_edit", "تم أرشفة المعتمر", c?.name || id);
    sync(() => db.clients.upsert({ id, archived: true, archivedAt: now }, agencyId));
  }, [clients, setClients, logActivity, sync, agencyId]);

  const archiveClients = useCallback((ids) => {
    const now = new Date().toISOString();
    setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, archived: true, archivedAt: now } : c));
    ids.forEach(id => sync(() => db.clients.upsert({ id, archived: true, archivedAt: now }, agencyId)));
  }, [setClients, sync, agencyId]);

  const restoreClient = useCallback((id) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, archived: false, archivedAt: null } : c));
    const c = clients.find(x => x.id === id);
    logActivity("client_edit", "تمت استعادة المعتمر من الأرشيف", c?.name || id);
    sync(() => db.clients.upsert({ id, archived: false, archivedAt: null }, agencyId));
  }, [clients, setClients, logActivity, sync, agencyId]);

  const archiveProgram = useCallback((programId) => {
    const now        = new Date().toISOString();
    const progClients = activeClients.filter(c => c.programId === programId);
    if (progClients.length === 0) return;
    const ids = progClients.map(c => c.id);
    setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, archived: true, archivedAt: now } : c));
    ids.forEach(id => sync(() => db.clients.upsert({ id, archived: true, archivedAt: now }, agencyId)));
  }, [activeClients, setClients, sync, agencyId]);

  const addPayment = useCallback((data) => {
    const id          = genId("PMT");
    const autoReceipt = "REC-" + id.slice(-6).toUpperCase();
    const pmt = {
      ...data, id,
      receiptNo: data.receiptNo || autoReceipt,
      date:      data.date || new Date().toISOString().split("T")[0],
    };
    setPayments(prev => [...prev, pmt]);
    const c   = clients.find(x => x.id === data.clientId);
    const now = new Date().toISOString().split("T")[0];
    setClients(prev => prev.map(x => x.id === data.clientId ? { ...x, lastModified: now } : x));
    logActivity("payment_add", `دفعة ${data.amount.toLocaleString("ar-MA")} د.م — ${pmt.receiptNo}`, c?.name || data.clientId);
    sync(() => db.payments.upsert(pmt, agencyId));
    return pmt;
  }, [clients, setPayments, setClients, logActivity, sync, agencyId]);

  const deletePayment = useCallback((id) => {
    const p = payments.find(x => x.id === id);
    setPayments(prev => prev.filter(p => p.id !== id));
    logActivity("payment_del", `تم حذف دفعة ${p?.receiptNo || ""}`, "");
    sync(() => db.payments.delete(id, agencyId));
  }, [payments, setPayments, logActivity, sync, agencyId]);

  const addProgram = useCallback((data) => {
    const id  = genId("PRG");
    const prg = { ...data, id, priceTable: data.priceTable || [] };
    setPrograms(prev => [...prev, prg]);
    logActivity("program_add", `تم إضافة برنامج جديد: ${data.name}`, "");
    sync(() => db.programs.upsert(prg, agencyId));
  }, [setPrograms, logActivity, sync, agencyId]);

  const updateProgram = useCallback((id, data) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    sync(() => db.programs.upsert({ id, ...data }, agencyId));
  }, [setPrograms, sync, agencyId]);

  const deleteProgram = useCallback((id) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    setClients(prev => prev.map(c => c.programId === id ? { ...c, programId: null } : c));
    sync(() => db.programs.delete(id, agencyId));
  }, [setPrograms, setClients, sync, agencyId]);

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
        ...programs.map(p => db.programs.upsert(p, agencyId)),
        ...clients.map(c  => db.clients.upsert(c, agencyId)),
        ...payments.map(p => db.payments.upsert(p, agencyId)),
        db.agency.update(agencyId, agency),
      ]);
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    } catch {
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
        setPayments(data.payments);
        if (data.agency) setAgency(data.agency);
        res();
      } catch(err) { rej(err); }
    };
    reader.readAsText(file);
  });

  const dbSyncing = syncStatus === "syncing";

  return {
    programs, clients, payments, agency, activityLog, stats,
    activeClients, archivedClients,
    dbLoading, dbSyncing, syncStatus, lastSynced, isSupabaseEnabled,
    getClientPayments, getClientTotalPaid, getClientStatus,
    getClientLastPayment, getProgramClients, getProgramById, getAlerts, getArchiveSuggestions,
    addClient, updateClient, deleteClient,
    archiveClient, archiveClients, restoreClient, archiveProgram,
    addPayment, deletePayment,
    addProgram, updateProgram, deleteProgram,
    updateAgency, exportData, importData, forceSync,
  };
}
