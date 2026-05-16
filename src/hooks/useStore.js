import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DEFAULT_AGENCY } from "../data/initialData";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import { db } from "../lib/db";
import { fetchRecentActivity } from "../services/activityService";
import { fetchNotifications } from "../services/notificationsService";
import {
  createPreviousPayment,
  createPaymentWithReceipt,
  deletePayment as deletePaymentRemote,
  deleteTrashedPayment as deleteTrashedPaymentRemote,
  fetchPayments,
  fetchTrashedPayments,
  restorePayment as restorePaymentRemote,
  savePayment,
} from "../services/paymentsService";
import {
  fetchClients,
  fetchDeletedClients,
  saveClient,
  markClientsDeleted,
  restoreClients,
  deleteClientsPermanent,
} from "../services/clientsService";
import {
  fetchPrograms,
  fetchDeletedPrograms,
  saveProgram,
  markProgramDeleted,
  restoreProgram,
  deleteProgramsPermanent,
} from "../services/programsService";
import { useNotificationsSlice } from "./useNotificationsSlice";
import { useActivitySlice } from "./useActivitySlice";
import { usePaymentsSlice } from "./usePaymentsSlice";
import { isPreviousPaymentRecord, normalizePaymentRecord, PAYMENT_TYPE_PREVIOUS } from "../utils/paymentRecords";
import { useClientsSlice } from "./useClientsSlice";
import { fetchAgencyUsers } from "../services/usersService";
import { buildExportPayload, parseImportPayload } from "../services/dataBackupService";
import {
  buildAgencyBackupArchive,
  buildBackupArchiveFilename,
  collectLocalRoomingBackupSnapshots,
  mergeRoomingBackupSnapshots,
  readBackupPayloadFromFile,
} from "../services/agencyBackupArchiveService";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientDisplayName, getClientIdentityName } from "../utils/clientNames";
import { getClientServiceType } from "../utils/clientServiceTypes";
import { getClientEffectiveOfficialPrice, getClientEffectiveSalePrice, getClientRemainingAmount } from "../utils/clientPricing";
import { formatCurrency } from "../utils/currency";
import { getUiLang, trKey, translateActivityDescription } from "../utils/i18nValues";
import { readSavedInvoices } from "../utils/invoices";
import { buildSystemNotificationCandidates, getDaysUntil, getProgramDepartureDate } from "../utils/notificationRules";
import {
  canUseBadgePhotoStorage,
  getPilgrimPhotoUrl,
  removePilgrimPhoto,
  uploadPilgrimPhoto,
} from "../features/badges";
import {
  canUseAgencyLogoStorage,
  getAgencyLogoUrl,
  removeAgencyLogo,
  uploadAgencyLogo,
} from "../utils/agencyLogo";

const EMPTY_DASHBOARD_STATS = {
  totalClients: 0,
  archivedCount: 0,
  totalPrograms: 0,
  cleared: 0,
  partial: 0,
  unpaid: 0,
  totalRevenue: 0,
  totalCollected: 0,
  totalRemaining: 0,
  totalDiscount: 0,
  docsIncomplete: 0,
  programClientCounts: {},
  hajjClientsCount: 0,
  umrahClientsCount: 0,
  unreadNotificationsCount: 0,
};

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

const normalizeClientGender = (value) => {
  const normalized = trimString(value).toLowerCase();
  if (normalized === "male" || normalized === "m" || normalized === "ذكر") return "male";
  if (normalized === "female" || normalized === "f" || normalized === "أنثى") return "female";
  return "";
};

const toPassportGender = (gender) => {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "";
};

const buildDisplayName = (data) => {
  return getClientIdentityName(data);
};

const sanitizePassport = (passport = {}) => ({
  number:      trimString(passport.number || ""),
  cin:         trimString(passport.cin || passport.nationalId || ""),
  nationality: trimString(passport.nationality || ""),
  birthDate:   trimString(passport.birthDate || ""),
  expiry:      trimString(passport.expiry || ""),
  gender:      trimString(passport.gender || ""),
  issueDate:   trimString(passport.issueDate || ""),
});

const sanitizeDocs = (docs = {}) => ({
  passportCopy: Boolean(docs.passportCopy),
  photo:        Boolean(docs.photo),
  vaccine:      Boolean(docs.vaccine),
  contract:     Boolean(docs.contract),
  serviceType:  getClientServiceType(docs),
  ...(trimString(docs.badgePhotoPath) ? { badgePhotoPath: trimString(docs.badgePhotoPath) } : {}),
  ...(docs.rooming ? { rooming: docs.rooming } : {}),
  ...(docs.deletedProgramSnapshot && typeof docs.deletedProgramSnapshot === "object"
    ? { deletedProgramSnapshot: docs.deletedProgramSnapshot }
    : {}),
});

const sanitizeRoomingMeta = (data = {}, docs = {}) => {
  const rooming = docs?.rooming || {};
  const roomingGroupId = trimString(data.roomingGroupId || rooming.groupId);
  const roomingGroupName = trimString(data.roomingGroupName || rooming.groupName);
  const roomCategory = trimString(data.roomCategory || rooming.category);
  const roomCategoryLabel = trimString(data.roomCategoryLabel || rooming.categoryLabel);
  const roomingGroupSize = Number(data.roomingGroupSize ?? rooming.groupSize ?? 0) || 0;
  const roomingSeatIndex = Number(data.roomingSeatIndex ?? rooming.seatIndex ?? 0) || 0;
  if (!roomingGroupId && !roomCategory) return null;
  return {
    groupId: roomingGroupId,
    groupName: roomingGroupName,
    category: roomCategory,
    categoryLabel: roomCategoryLabel,
    groupSize: roomingGroupSize,
    seatIndex: roomingSeatIndex,
  };
};

const getNotificationKey = (notif) => {
  if (!notif) return "ntf:none";
  const persistKey = notif.persistKey || notif.meta?.persistKey;
  if (persistKey) return `persist:${persistKey}`;
  const type = notif.type || "system";
  const target = notif.targetId || notif.programId || "none";
  const state = notif.stateHash || (notif.meta && notif.meta.stateHash) || "default";
  return `${type}:${target}:${state}`;
};

const localizedPaymentTrashMessage = () => {
  const lang = getUiLang();
  if (lang === "fr") return "Le paiement a été déplacé vers la corbeille";
  if (lang === "en") return "Payment moved to Trash";
  return "تم نقل الدفعة إلى سلة المحذوفات";
};

const localizedPaymentRestoreMessage = () => {
  const lang = getUiLang();
  if (lang === "fr") return "Paiement restauré";
  if (lang === "en") return "Payment restored";
  return "تم استرجاع الدفعة";
};

const getPaymentClientId = (payment = {}) => payment.clientId || payment.client_id || "";

const CLIENT_PERMANENT_DELETE_BLOCK_CODES = new Set([
  "ACTIVE_LINKED_PAYMENTS",
  "ACTIVE_PAYMENTS",
  "ACTIVE_LINKED_INVOICES",
  "ACTIVE_LINKED_FINANCIAL_RECORDS",
  "LINKED_EXTERNAL_PAYMENTS",
  "LINKED_EXTERNAL_INVOICES",
  "LINKED_PAYMENT_RECORDS",
  "LINKED_REPRESENTATION_CLIENTS",
  "LINKED_ROOMING_ASSIGNMENTS",
  "LINKED_ACTIVITY_LOGS",
  "LINKED_NOTIFICATIONS",
  "LINKED_DOCUMENTS",
  "LINKED_BADGE_DATA",
  "LINKED_PAYMENTS",
  "LINKED_INVOICES",
  "LINKED_DELETED_INVOICES",
  "LINKED_FINANCIAL_RECORDS",
  "LINKED_RECORDS",
  "UNKNOWN_LINKED_RECORDS",
  "23503",
]);

const isInactiveLinkedPayment = (payment = {}) => {
  const status = trimString(payment.status).toLowerCase();
  if (["trashed", "deleted", "inactive", "archived", "void", "cancelled", "canceled"].includes(status)) return true;
  if (payment.trashedAt || payment.trashed_at || payment.deletedAt || payment.deleted_at) return true;
  if (payment.deleted === true || payment.trashed === true || payment.archived === true) return true;
  return false;
};

const isActiveLinkedPayment = (payment = {}) => !isInactiveLinkedPayment(payment);

const isActiveLinkedInvoice = (invoice = {}) => {
  const status = trimString(invoice.status).toLowerCase();
  return !["trashed", "deleted", "void", "cancelled", "canceled"].includes(status);
};

const roomingRecordContainsClient = (assignment = {}, clientId = "") => {
  if (!clientId) return false;
  return JSON.stringify([assignment.rooms || [], assignment.unassigned || []]).includes(clientId);
};

const runWithConcurrencyLimit = async (items = [], limit = 3, worker) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeLimit = Math.max(1, Number(limit) || 1);
  const results = new Array(safeItems.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(safeLimit, safeItems.length) }, async () => {
    while (nextIndex < safeItems.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(safeItems[currentIndex], currentIndex);
    }
  });
  await Promise.all(runners);
  return results;
};

const normalizeRemoteClientDeleteCheck = (clientId, payload = {}) => {
  const linkedRecords = payload.linkedRecords || {};
  const cleanupPreview = payload.cleanupPreview || payload.cleanup || {};
  const cleanupReasons = Array.isArray(payload.cleanupReasons) ? payload.cleanupReasons : [];
  const reasons = Array.isArray(payload.reasons) ? payload.reasons : [];
  const blocked = Boolean(payload.blocked || payload.canDelete === false);
  const hasSafeCleanup = Boolean(payload.hasSafeCleanup || cleanupReasons.length > 0);
  return {
    clientId,
    blocked,
    code: String(payload.code || (hasSafeCleanup ? "DELETE_LINKED_RECORDS_AFTER_CONFIRMATION" : "")),
    activePaymentCount: Number(linkedRecords.payments?.active || 0),
    inactivePaymentCount: Number(linkedRecords.payments?.inactive || cleanupPreview.deletedPaymentsCount || 0),
    paymentCount: Number(linkedRecords.payments?.total || 0),
    activeInvoiceCount: Number(linkedRecords.invoices?.active || 0),
    inactiveInvoiceCount: Number(linkedRecords.invoices?.inactive || cleanupPreview.deletedInvoicesCount || 0),
    invoiceCount: Number(linkedRecords.invoices?.total || 0),
    hiddenPaymentCount: Number(linkedRecords.hiddenPayments?.total || 0),
    hiddenInvoiceCount: Number(linkedRecords.hiddenInvoices?.active || linkedRecords.hiddenInvoices?.total || 0),
    representationLinkCount: Number(cleanupPreview.clearedRepresentationLinksCount || 0),
    notificationCount: Number(cleanupPreview.deletedNotificationsCount || 0),
    roomingAssignmentCount: Number(cleanupPreview.cleanedRoomingAssignmentsCount || 0),
    badgePhotoCount: Number(cleanupPreview.deletedBadgePhotosCount || 0),
    hasSafeCleanup,
    reasons,
    cleanupReasons,
    inactivePaymentIds: Array.isArray(cleanupPreview.deletedPaymentIds) ? cleanupPreview.deletedPaymentIds : [],
    message: payload.error || payload.message || "",
    details: payload.details || null,
  };
};

const normalizeBatchedClientDeleteCheck = (clientId, row = null) => {
  const base = {
    clientId,
    blocked: false,
    code: "",
    activePaymentCount: 0,
    inactivePaymentCount: 0,
    paymentCount: 0,
    activeInvoiceCount: 0,
    inactiveInvoiceCount: 0,
    invoiceCount: 0,
    finalInvoiceCount: 0,
    hiddenPaymentCount: 0,
    hiddenInvoiceCount: 0,
    representationLinkCount: 0,
    notificationCount: 0,
    roomingAssignmentCount: 0,
    badgePhotoCount: 0,
    hasSafeCleanup: false,
    reasons: [],
    cleanupReasons: [],
    inactivePaymentIds: [],
  };

  if (!row) {
    return {
      ...base,
      code: "CHECK_UNAVAILABLE",
      precheckUnavailable: true,
    };
  }

  const paymentCount = Number(row.paymentsCount ?? row.payments_count ?? 0);
  const activePaymentCount = Number(row.activePaymentsCount ?? row.active_payments_count ?? 0);
  const inactivePaymentCount = Number(row.inactivePaymentsCount ?? row.inactive_payments_count ?? 0);
  const invoiceCount = Number(row.invoicesCount ?? row.invoices_count ?? 0);
  const activeInvoiceCount = Number(row.activeInvoicesCount ?? row.active_invoices_count ?? 0);
  const inactiveInvoiceCount = Number(row.inactiveInvoicesCount ?? row.inactive_invoices_count ?? 0);
  const finalInvoiceCount = Number(row.finalInvoicesCount ?? row.final_invoices_count ?? 0);
  const representationLinkCount = Number(row.representationLinksCount ?? row.representation_links_count ?? 0);
  const notificationCount = Number(row.notificationsCount ?? row.notifications_count ?? 0);
  const roomingAssignmentCount = Number(row.roomingReferencesCount ?? row.rooming_references_count ?? 0);
  const badgePhotoCount = row.hasBadgePhoto || row.has_badge_photo ? 1 : 0;
  const cleanupReasons = [];

  if (paymentCount > 0) cleanupReasons.push({ code: "DELETE_LINKED_PAYMENTS", count: paymentCount });
  if (invoiceCount > 0) cleanupReasons.push({ code: "DELETE_LINKED_INVOICES", count: invoiceCount });
  if (representationLinkCount > 0) cleanupReasons.push({ code: "CLEANUP_REPRESENTATION_LINKS", count: representationLinkCount });
  if (roomingAssignmentCount > 0) cleanupReasons.push({ code: "CLEANUP_ROOMING_ASSIGNMENTS", count: roomingAssignmentCount });
  if (notificationCount > 0) cleanupReasons.push({ code: "CLEANUP_NOTIFICATIONS", count: notificationCount });
  if (badgePhotoCount > 0) cleanupReasons.push({ code: "DELETE_BADGE_PHOTO", count: badgePhotoCount });

  const blocked = row.canPermanentDelete === false || row.can_permanent_delete === false;
  const code = String(row.blockReason || row.block_reason || (cleanupReasons.length ? "DELETE_LINKED_RECORDS_AFTER_CONFIRMATION" : ""));

  return {
    ...base,
    blocked,
    code,
    activePaymentCount,
    inactivePaymentCount,
    paymentCount,
    activeInvoiceCount,
    inactiveInvoiceCount,
    invoiceCount,
    finalInvoiceCount,
    representationLinkCount,
    notificationCount,
    roomingAssignmentCount,
    badgePhotoCount,
    hasSafeCleanup: cleanupReasons.length > 0,
    reasons: blocked && code ? [{ code, count: 1 }] : [],
    cleanupReasons,
  };
};

const filterPaymentsForClients = (paymentData = [], clientData = []) => {
  const safePayments = Array.isArray(paymentData) ? paymentData : [];
  const safeClients = Array.isArray(clientData) ? clientData : [];
  const clientIds = new Set(safeClients.map((client) => client?.id).filter(Boolean));
  if (!clientIds.size) return [];
  return safePayments.filter((payment) => clientIds.has(getPaymentClientId(payment)));
};

const buildDeletedProgramSnapshot = (program = {}, client = {}, deletedAt = new Date().toISOString()) => ({
  snapshotVersion: 1,
  kind: "deleted_program",
  originalProgramId: program.id || client.programId || "",
  programName: program.name || "",
  programNameFr: program.nameFr || "",
  programType: program.type || "",
  transport: program.transport || "",
  departure: program.departure || "",
  returnDate: program.returnDate || "",
  packageLevel: client.packageLevel || client.hotelLevel || "",
  hotelLevel: client.hotelLevel || client.packageLevel || "",
  hotelMecca: client.hotelMecca || program.hotelMecca || "",
  hotelMadina: client.hotelMadina || program.hotelMadina || "",
  roomType: client.roomType || "",
  roomTypeLabel: client.roomTypeLabel || getRoomTypeLabel(client.roomType) || "",
  salePrice: Number(client.salePrice ?? client.price ?? 0),
  officialPrice: Number(client.officialPrice ?? client.salePrice ?? client.price ?? 0),
  deletedAt,
});

const prepareClientForSave = (data) => {
  const gender = normalizeClientGender(data.gender || data.passport?.gender);
  const passport = sanitizePassport(data.passport);
  const rooming = sanitizeRoomingMeta(data, data.docs);
  const badgePhotoPath = trimString(data.badgePhotoPath || data.docs?.badgePhotoPath);
  const serviceType = getClientServiceType(data);
  const cleaned = {
    ...data,
    firstName: trimString(data.firstName),
    lastName:  trimString(data.lastName),
    nom:       trimString(data.nom),
    prenom:    trimString(data.prenom),
    phone:     trimString(data.phone),
    cin:       trimString(data.cin || data.nationalId || data.passport?.cin || data.passport?.nationalId),
    city:      trimString(data.city),
    ticketNo:  trimString(data.ticketNo),
    representedByClientId: trimString(data.representedByClientId || data.represented_by_client_id),
    representedByRelationship: trimString(data.representedByRelationship || data.represented_by_relationship),
    notes:     typeof data.notes === "string" ? data.notes.trim() : data.notes ?? "",
    gender,
    serviceType,
    passport:  {
      ...passport,
      cin: trimString(data.cin || passport.cin),
      gender: toPassportGender(gender),
    },
    badgePhotoPath,
    docs:      {
      ...sanitizeDocs({ ...data.docs, badgePhotoPath, serviceType }),
      ...(rooming ? { rooming } : {}),
    },
  };
  cleaned.roomingGroupId = rooming?.groupId || "";
  cleaned.roomingGroupName = rooming?.groupName || "";
  cleaned.roomCategory = rooming?.category || "";
  cleaned.roomCategoryLabel = rooming?.categoryLabel || "";
  cleaned.roomingGroupSize = rooming?.groupSize || 0;
  cleaned.roomingSeatIndex = rooming?.seatIndex || 0;
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
const stripAgencyRuntimeFields = (agency = {}) => {
  if (!agency || typeof agency !== "object") return agency;
  const { logoUrl, logo_url, ...persisted } = agency;
  return persisted;
};

function useLS(key, init, sanitize = (value) => value) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return sanitize(s ? JSON.parse(s) : init);
    }
    catch { return sanitize(init); }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(sanitize(val))); } catch (e) {
      console.warn("[useLS] Failed to write localStorage:", key, e);
    }
  }, [key, sanitize, val]);
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

  const [programs,        setPrograms]        = useState([]);
  const [deletedPrograms, setDeletedPrograms] = useState([]);
  const {
    clients,
    deletedClients,
    setClients,
    setDeletedClients,
    setInitialClients,
    addClientLocal,
    updateClientLocal,
    archiveClientLocal,
    restoreArchivedClientLocal,
    softDeleteClientsLocal,
    transferClientsLocal,
  } = useClientsSlice();
  const [agency,        setAgency]        = useLS(`umrah_agency_v4_${ns}`,    DEFAULT_AGENCY, stripAgencyRuntimeFields);
  const {
    activityLog,
    setInitialActivity,
    fetchActivityLogPage,
    clearActivityLog,
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
    deleteNotification,
    deleteNotifications,
    deleteAllArchived,
  } = useNotificationsSlice({
    agencyId,
    isSupabaseEnabled,
    generateUUID,
    getNotificationKey,
    storageKeyPrefix: `rukn_notifications_${ns}`,
  });
  const {
    payments,
    deletedPayments,
    setInitialPayments,
    setInitialDeletedPayments,
    replacePayments,
    handleRealtimeUpsert: handlePaymentRealtimeUpsert,
    handleRealtimeDelete: handlePaymentRealtimeDelete,
    addPaymentLocal,
    trashPaymentLocal,
    restorePaymentLocal,
    purgePaymentLocal,
    removePaymentsByClient,
    paymentsByClient,
    paidByClient,
    lastPaymentByClient,
    getClientPayments,
    getClientTotalPaid,
    getClientLastPayment,
  } = usePaymentsSlice();

  const [dbLoading,   setDbLoading]   = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashLoaded, setTrashLoaded] = useState(false);
  const [trashError, setTrashError] = useState(null);
  // syncStatus: 'synced' | 'syncing' | 'offline'
  const [syncStatus,  setSyncStatus]  = useState("synced");
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [lastSynced,  setLastSynced]  = useState(() => {
    try {
      const s = localStorage.getItem(`umrah_last_synced_${ns}`);
      return s ? new Date(s) : null;
    } catch { return null; }
  });
  const [agencyUsers, setAgencyUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(!isSupabaseEnabled || !agencyId);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(!isSupabaseEnabled || !agencyId);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(!isSupabaseEnabled || !agencyId);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(!isSupabaseEnabled || !agencyId);
  const [backgroundHydrationLoading, setBackgroundHydrationLoading] = useState(false);
  const [backgroundHydrationDone, setBackgroundHydrationDone] = useState(!isSupabaseEnabled || !agencyId);
  const [trashedInvoicesCache, setTrashedInvoicesCache] = useState([]);
  const [trashedInvoicesLoaded, setTrashedInvoicesLoaded] = useState(false);

  // Prevent double-fetch in React StrictMode
  const fetchedRef = useRef(false);
  const clientsRef = useRef(clients);
  const paymentsRef = useRef(payments);
  const notificationsRef = useRef(notifications);
  const agencyUsersRef = useRef(agencyUsers);
  const clientsLoadedRef = useRef(clientsLoaded);
  const paymentsLoadedRef = useRef(paymentsLoaded);
  const notificationsLoadedRef = useRef(notificationsLoaded);
  const usersLoadedRef = useRef(usersLoaded);
  const clientsLoadPromiseRef = useRef(null);
  const paymentsLoadPromiseRef = useRef(null);
  const notificationsLoadPromiseRef = useRef(null);
  const usersLoadPromiseRef = useRef(null);
  const backgroundHydrationStartedRef = useRef(false);
  const dashboardStatsPromiseRef = useRef(null);
  const clientPermanentDeletePreflightCacheRef = useRef(new Map());

  useEffect(() => { clientsRef.current = clients; }, [clients]);
  useEffect(() => { paymentsRef.current = payments; }, [payments]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { agencyUsersRef.current = agencyUsers; }, [agencyUsers]);
  useEffect(() => { clientsLoadedRef.current = clientsLoaded; }, [clientsLoaded]);
  useEffect(() => { paymentsLoadedRef.current = paymentsLoaded; }, [paymentsLoaded]);
  useEffect(() => { notificationsLoadedRef.current = notificationsLoaded; }, [notificationsLoaded]);
  useEffect(() => { usersLoadedRef.current = usersLoaded; }, [usersLoaded]);
  useEffect(() => { clientPermanentDeletePreflightCacheRef.current.clear(); }, [agencyId]);

  const notify = useCallback((msg, type = "error") => {
    if (onToast) onToast(msg, type);
    else console.warn("[Store]", msg);
  }, [onToast]);

  const refreshDashboardStats = useCallback(async () => {
    if (!isSupabaseEnabled || !agencyId) {
      setDashboardStats(null);
      return { data: null, error: null };
    }

    if (dashboardStatsPromiseRef.current) return dashboardStatsPromiseRef.current;

    const promise = (async () => {
      const summaryResult = await db.dashboard.fetchSummary();
      if (!summaryResult.error && summaryResult.data) {
        setDashboardStats({ ...EMPTY_DASHBOARD_STATS, ...summaryResult.data });
        return summaryResult;
      }

      if (summaryResult.error) {
        console.warn("[Store] Dashboard summary RPC failed; falling back to raw stats.", summaryResult.error);
      }

      const result = await db.dashboard.fetchStats(agencyId);
      if (!result.error && result.data) {
        setDashboardStats({ ...EMPTY_DASHBOARD_STATS, ...result.data });
      }
      return result;
    })().finally(() => {
      dashboardStatsPromiseRef.current = null;
    });

    dashboardStatsPromiseRef.current = promise;
    return promise;
  }, [agencyId, isSupabaseEnabled]);

  useEffect(() => {
    refreshDashboardStats();
  }, [refreshDashboardStats, lastSynced]);

  // ── Archived / Active split ───────────────────────────────────────────────
  const archivedClients      = useMemo(() => clients.filter(c => !!c.archived),  [clients]);
  const activeClients        = useMemo(() => clients.filter(c => !c.archived),   [clients]);
  const clearActivityLogConfirmed = useCallback((days = 0) => clearActivityLog(days), [clearActivityLog]);

  const badgePhotoApi = useMemo(() => (
    isSupabaseEnabled && agencyId && canUseBadgePhotoStorage()
      ? {
          isAvailable: true,
          getPhotoUrl: getPilgrimPhotoUrl,
          uploadPhoto: (clientId, file) => uploadPilgrimPhoto({ agencyId, clientId, file }),
          removePhoto: removePilgrimPhoto,
        }
      : { isAvailable: false }
  ), [agencyId, isSupabaseEnabled]);

  const agencyLogoApi = useMemo(() => (
    isSupabaseEnabled && agencyId && canUseAgencyLogoStorage()
      ? {
          isAvailable: true,
          getLogoUrl: getAgencyLogoUrl,
          uploadLogo: (file, previousPath) => uploadAgencyLogo({ agencyId, file, previousPath }),
          removeLogo: removeAgencyLogo,
        }
      : { isAvailable: false }
  ), [agencyId, isSupabaseEnabled]);

  useEffect(() => {
    let cancelled = false;
    const path = agency?.logoPath || agency?.logo_path || "";
    if (!path || !agencyLogoApi?.isAvailable || !agencyLogoApi.getLogoUrl) {
      return undefined;
    }
    agencyLogoApi.getLogoUrl(path).then((url) => {
      if (cancelled || !url) return;
      setAgency((prev) => (
        prev.logoPath === path && prev.logoUrl === url ? prev : { ...prev, logoUrl: url }
      ));
    });
    return () => { cancelled = true; };
  }, [agency?.logoPath, agency?.logo_path, agencyLogoApi, setAgency]);

  const fetchFinalInvoices = useCallback(() => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: [], error: null });
    return db.invoices.fetch(agencyId);
  }, [agencyId, isSupabaseEnabled]);

  const fetchTrashedFinalInvoices = useCallback(async ({ force = false } = {}) => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: [], error: null });
    if (!force && trashedInvoicesLoaded) return { data: trashedInvoicesCache, error: null };
    const result = await db.invoices.fetchTrashed(agencyId);
    if (!result.error) {
      setTrashedInvoicesCache(Array.isArray(result.data) ? result.data : []);
      setTrashedInvoicesLoaded(true);
    }
    return result;
  }, [agencyId, isSupabaseEnabled, trashedInvoicesCache, trashedInvoicesLoaded]);

  const issueFinalInvoiceSnapshot = useCallback((draft) => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: null, error: null });
    return db.invoices.issueFinal(agencyId, draft);
  }, [agencyId, isSupabaseEnabled]);

  const getInvoiceActivityName = useCallback((invoice) => {
    const recipient = invoice?.recipientSnapshot || {};
    return invoice?.recipientType === "company"
      ? recipient.companyName || recipient.name || invoice?.invoiceDisplayNumber || ""
      : recipient.clientName || recipient.name || invoice?.invoiceDisplayNumber || "";
  }, []);

  const trashFinalInvoice = useCallback(async (id) => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: null, error: null });
    const result = await db.invoices.trash(agencyId, id);
    if (!result.error && result.data) {
      setTrashedInvoicesLoaded(false);
      logActivity(
        "invoice_trash",
        translateActivityDescription(`تم نقل فاتورة ${result.data.invoiceDisplayNumber || id} إلى سلة المحذوفات`),
        getInvoiceActivityName(result.data)
      );
    }
    return result;
  }, [agencyId, getInvoiceActivityName, logActivity]);

  const restoreFinalInvoice = useCallback(async (id) => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: null, error: null });
    const result = await db.invoices.restore(agencyId, id);
    if (!result.error && result.data) {
      setTrashedInvoicesLoaded(false);
      logActivity(
        "invoice_restore",
        translateActivityDescription(`تمت استعادة فاتورة ${result.data.invoiceDisplayNumber || id}`),
        getInvoiceActivityName(result.data)
      );
    }
    return result;
  }, [agencyId, getInvoiceActivityName, logActivity]);

  const deleteFinalInvoice = useCallback(async (id) => {
    if (!isSupabaseEnabled || !agencyId) return Promise.resolve({ data: null, error: null });
    const result = await db.invoices.markDeleted(agencyId, id);
    if (!result.error) setTrashedInvoicesLoaded(false);
    return result;
  }, [agencyId, isSupabaseEnabled]);

  const invoiceApi = useMemo(() => (
    isSupabaseEnabled && agencyId
      ? {
          isRemote: true,
          fetchFinalInvoices,
          fetchTrashedFinalInvoices,
          issueFinalInvoiceSnapshot,
          trashFinalInvoice,
          restoreFinalInvoice,
          deleteFinalInvoice,
        }
      : null
  ), [
    agencyId,
    deleteFinalInvoice,
    fetchFinalInvoices,
    fetchTrashedFinalInvoices,
    issueFinalInvoiceSnapshot,
    restoreFinalInvoice,
    trashFinalInvoice,
  ]);

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

  const loadClients = useCallback(async ({ force = false } = {}) => {
    if (!isSupabaseEnabled || !agencyId) {
      setClientsLoading(false);
      setClientsLoaded(true);
      return { data: clientsRef.current, error: null };
    }
    if (!force && clientsLoadedRef.current) {
      return { data: clientsRef.current, error: null };
    }
    if (clientsLoadPromiseRef.current) return clientsLoadPromiseRef.current;

    setClientsLoading(true);
    const promise = fetchClients(agencyId)
      .then((result) => {
        if (!result?.error && Array.isArray(result?.data)) {
          clientsRef.current = result.data;
          setInitialClients(result.data);
          clientsLoadedRef.current = true;
          setClientsLoaded(true);
        } else if (result?.error) {
          console.error("[Store] Background clients fetch failed:", result.error);
        }
        return result;
      })
      .catch((error) => {
        console.error("[Store] Background clients fetch failed:", error);
        return { data: null, error };
      })
      .finally(() => {
        setClientsLoading(false);
        clientsLoadPromiseRef.current = null;
      });

    clientsLoadPromiseRef.current = promise;
    return promise;
  }, [agencyId, isSupabaseEnabled, setInitialClients]);

  const loadPayments = useCallback(async ({ force = false, clientData = null } = {}) => {
    if (!isSupabaseEnabled || !agencyId) {
      setPaymentsLoading(false);
      setPaymentsLoaded(true);
      return { data: paymentsRef.current, error: null };
    }
    if (!force && paymentsLoadedRef.current) {
      return { data: paymentsRef.current, error: null };
    }
    if (paymentsLoadPromiseRef.current) return paymentsLoadPromiseRef.current;

    setPaymentsLoading(true);
    const promise = (async () => {
      const clientsForFilter = Array.isArray(clientData)
        ? clientData
        : clientsLoadedRef.current
          ? clientsRef.current
          : (await loadClients()).data;
      if (!Array.isArray(clientsForFilter)) {
        return { data: null, error: new Error("Clients must load before payments") };
      }

      const result = await fetchPayments(agencyId);
      if (!result?.error && Array.isArray(result?.data)) {
        const filteredPayments = filterPaymentsForClients(result.data, clientsForFilter);
        paymentsRef.current = filteredPayments;
        setInitialPayments(filteredPayments);
        paymentsLoadedRef.current = true;
        setPaymentsLoaded(true);
        return { ...result, data: filteredPayments };
      }
      if (result?.error) console.error("[Store] Background payments fetch failed:", result.error);
      return result;
    })()
      .catch((error) => {
        console.error("[Store] Background payments fetch failed:", error);
        return { data: null, error };
      })
      .finally(() => {
        setPaymentsLoading(false);
        paymentsLoadPromiseRef.current = null;
      });

    paymentsLoadPromiseRef.current = promise;
    return promise;
  }, [agencyId, isSupabaseEnabled, loadClients, setInitialPayments]);

  const loadNotifications = useCallback(async ({ force = false } = {}) => {
    if (!isSupabaseEnabled || !agencyId) {
      setNotificationsLoading(false);
      setNotificationsLoaded(true);
      return { data: notificationsRef.current, error: null };
    }
    if (!force && notificationsLoadedRef.current) {
      return { data: notificationsRef.current, error: null };
    }
    if (notificationsLoadPromiseRef.current) return notificationsLoadPromiseRef.current;

    setNotificationsLoading(true);
    const promise = fetchNotifications(agencyId)
      .then((result) => {
        if (!result?.error && Array.isArray(result?.data)) {
          notificationsRef.current = result.data;
          setInitialNotifications(result.data);
          notificationsLoadedRef.current = true;
          setNotificationsLoaded(true);
        } else if (result?.error) {
          console.error("[Store] Background notifications fetch failed:", result.error);
        }
        return result;
      })
      .catch((error) => {
        console.error("[Store] Background notifications fetch failed:", error);
        return { data: null, error };
      })
      .finally(() => {
        setNotificationsLoading(false);
        notificationsLoadPromiseRef.current = null;
      });

    notificationsLoadPromiseRef.current = promise;
    return promise;
  }, [agencyId, isSupabaseEnabled, setInitialNotifications]);

  const refreshAgencyUsers = useCallback(async ({ force = false } = {}) => {
    if (!isSupabaseEnabled || !agencyId) {
      setAgencyUsers([]);
      setUsersLoading(false);
      setUsersLoaded(true);
      return { data: [], error: null };
    }
    if (!force && usersLoadedRef.current) {
      return { data: agencyUsersRef.current, error: null };
    }
    if (usersLoadPromiseRef.current) return usersLoadPromiseRef.current;

    setUsersLoading(true);
    const promise = fetchAgencyUsers(agencyId)
      .then((result) => {
        if (!result?.error && Array.isArray(result?.data)) {
          agencyUsersRef.current = result.data;
          setAgencyUsers(result.data);
          usersLoadedRef.current = true;
          setUsersLoaded(true);
        } else if (result?.error) {
          console.error("[Store] Agency users fetch failed:", result.error);
        }
        return result;
      })
      .catch((error) => {
        console.error("[Store] Agency users fetch failed:", error);
        return { data: null, error };
      })
      .finally(() => {
        setUsersLoading(false);
        usersLoadPromiseRef.current = null;
      });

    usersLoadPromiseRef.current = promise;
    return promise;
  }, [agencyId, isSupabaseEnabled]);

  const startBackgroundHydration = useCallback(() => {
    if (!isSupabaseEnabled || !agencyId || backgroundHydrationStartedRef.current) return;
    backgroundHydrationStartedRef.current = true;
    setBackgroundHydrationLoading(true);
    setBackgroundHydrationDone(false);

    (async () => {
      const clientsResult = await loadClients();
      const clientData = Array.isArray(clientsResult?.data) ? clientsResult.data : null;
      await Promise.allSettled([
        loadPayments({ clientData }),
        loadNotifications(),
        refreshAgencyUsers(),
      ]);
    })()
      .catch((error) => {
        console.error("[Store] Background hydration failed:", error);
      })
      .finally(() => {
        setBackgroundHydrationLoading(false);
        setBackgroundHydrationDone(true);
      });
  }, [agencyId, isSupabaseEnabled, loadClients, loadNotifications, loadPayments, refreshAgencyUsers]);

  const loadTrashData = useCallback(async ({ force = false } = {}) => {
    if (!force && (trashLoaded || trashLoading)) return { error: null };
    if (!isSupabaseEnabled || !agencyId) {
      setTrashLoaded(true);
      setTrashLoading(false);
      setTrashError(null);
      return { error: null };
    }
    setTrashLoading(true);
    setTrashError(null);
    try {
      const [programResult, clientResult, paymentResult] = await Promise.all([
        fetchDeletedPrograms(agencyId),
        fetchDeletedClients(agencyId),
        fetchTrashedPayments(agencyId),
      ]);
      const error = programResult?.error || clientResult?.error || paymentResult?.error || null;
      if (error) {
        setTrashError(error);
        return { error };
      }
      setDeletedPrograms(Array.isArray(programResult.data) ? programResult.data : []);
      setDeletedClients(Array.isArray(clientResult.data) ? clientResult.data : []);
      setInitialDeletedPayments(Array.isArray(paymentResult.data) ? paymentResult.data : []);
      setTrashLoaded(true);
      return { error: null };
    } catch (error) {
      console.error("[Store] Trash fetch failed:", error);
      setTrashError(error);
      return { error };
    } finally {
      setTrashLoading(false);
    }
  }, [
    agencyId,
    isSupabaseEnabled,
    setDeletedPrograms,
    setDeletedClients,
    setInitialDeletedPayments,
    trashLoaded,
    trashLoading,
  ]);

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
    if (paymentsToSync.length) {
      console.warn("[Store] Skipped legacy payment upsert in Supabase mode; payments must be created through create_payment_with_receipt.");
    }
    if (!programsToSync.length && !clientsToSync.length) return;
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
      return { error };
    });
  }, [programs, clients, payments, setPrograms, setClients, replacePayments, isSupabaseEnabled, agencyId, sync]);

  // ── Initial fetch from Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId || fetchedRef.current) return;
    fetchedRef.current = true;
    setDbLoading(true);
    clientsLoadedRef.current = false;
    paymentsLoadedRef.current = false;
    notificationsLoadedRef.current = false;
    usersLoadedRef.current = false;
    backgroundHydrationStartedRef.current = false;
    setClientsLoaded(false);
    setPaymentsLoaded(false);
    setNotificationsLoaded(false);
    setUsersLoaded(false);
    setBackgroundHydrationDone(false);

    Promise.all([
      fetchPrograms(agencyId),
      db.agency.fetch(agencyId),
      refreshDashboardStats(),
      fetchRecentActivity(agencyId, 5),
    ]).then(([p, ag, _summary, act]) => {
      const programData  = !p.error  && p.data  ? p.data  : [];
      if (programData) setPrograms(programData);
      if (!ag.error  && ag.data)  setAgency(prev => ({ ...prev, ...ag.data }));
      if (!act.error && act.data) setInitialActivity(act.data);
      const now = new Date();
      setLastSynced(now);
      try { localStorage.setItem(`umrah_last_synced_${ns}`, now.toISOString()); } catch {}
      setSyncStatus("synced");
    }).catch((err) => {
      console.error("[Store] Initial Supabase fetch failed:", err);
      setSyncStatus("offline");
      notify(trKey("storeLocalMode") || "يعمل النظام بالوضع المحلي — تعذّر الاتصال بالسحابة");
    }).finally(() => {
      setDbLoading(false);
      setStoreHydrated(true);
      startBackgroundHydration();
    });
  }, [agencyId, ns, notify, refreshDashboardStats, startBackgroundHydration]);

  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId) {
      setClientsLoading(false);
      setClientsLoaded(true);
      setPaymentsLoading(false);
      setPaymentsLoaded(true);
      setNotificationsLoading(false);
      setNotificationsLoaded(true);
      setUsersLoading(false);
      setUsersLoaded(true);
      setBackgroundHydrationLoading(false);
      setBackgroundHydrationDone(true);
      setStoreHydrated(true);
    }
  }, [agencyId, isSupabaseEnabled]);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !agencyId) return;

    const mapProgramRow = (row) => ({
      id: row.id,
      name: row.name,
      nameFr: row.name_fr,
      type: row.type,
      duration: row.duration,
      departure: row.departure,
      returnDate: row.return_date,
      transport: row.transport,
      mealPlan: row.meal_plan,
      seats: row.seats,
      hotelMecca: row.hotel_mecca,
      hotelMadina: row.hotel_madina,
      priceTable: row.price_table ?? [],
      notes: row.notes,
      status: row.status,
      deleted: row.deleted ?? false,
      deletedAt: row.deleted_at ?? null,
      deletedBatchId: row.deleted_batch_id ?? null,
    });
    const mapClientRow = (row) => ({
      ...(row.docs?.rooming ? {
        roomingGroupId: row.docs.rooming.groupId || "",
        roomingGroupName: row.docs.rooming.groupName || "",
        roomCategory: row.docs.rooming.category || "",
        roomCategoryLabel: row.docs.rooming.categoryLabel || "",
        roomingGroupSize: Number(row.docs.rooming.groupSize || 0),
        roomingSeatIndex: Number(row.docs.rooming.seatIndex || 0),
      } : {}),
      id: row.id,
      programId: row.program_id,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      nom: row.nom,
      prenom: row.prenom,
      phone: row.phone,
      city: row.city,
      hotelLevel: row.hotel_level,
      packageLevel: row.hotel_level,
      hotelMecca: row.hotel_mecca,
      hotelMadina: row.hotel_madina,
      roomType: row.room_type,
      roomTypeLabel: getRoomTypeLabel(row.room_type),
      serviceType: getClientServiceType({ docs: row.docs }),
      officialPrice: Number(row.official_price ?? 0),
      salePrice: Number(row.sale_price ?? 0),
      ticketNo: row.ticket_no,
      passport: row.passport ?? {},
      docs: { ...(row.docs ?? {}), serviceType: getClientServiceType({ docs: row.docs }) },
      notes: row.notes,
      registrationDate: row.registration_date,
      lastModified: row.last_modified,
      archived: row.archived ?? false,
      archivedAt: row.archived_at ?? null,
      deleted: row.deleted ?? false,
      deletedAt: row.deleted_at ?? null,
      deletedBatchId: row.deleted_batch_id ?? null,
    });

    const channel = db.subscribeAll({
      agencyId,
      onProgram: ({ eventType, new: row, old }) => {
        // Extra check: ignore rows that don't belong to this agency
        if (row?.agency_id && row.agency_id !== agencyId) return;
        if ((eventType === "INSERT" || eventType === "UPDATE") && row) {
          const mapped = mapProgramRow(row);
          if (mapped.deleted) {
            setPrograms(prev => prev.filter(p => p.id !== mapped.id));
            setDeletedPrograms(prev => {
              const exists = prev.find(p => p.id === mapped.id);
              return exists
                ? prev.map(p => p.id === mapped.id ? { ...p, ...mapped } : p)
                : [mapped, ...prev];
            });
            return;
          }
          setDeletedPrograms(prev => prev.filter(p => p.id !== mapped.id));
          setPrograms(prev => {
            const exists = prev.find(p => p.id === mapped.id);
            return exists
              ? prev.map(p => p.id === mapped.id ? { ...p, ...mapped } : p)
              : [...prev, mapped];
          });
        } else if (eventType === "DELETE") {
          setPrograms(prev => prev.filter(p => p.id !== old.id));
          setDeletedPrograms(prev => prev.filter(p => p.id !== old.id));
        }
      },
      onClient: ({ eventType, new: row, old }) => {
        if (row?.agency_id && row.agency_id !== agencyId) return;
        if ((eventType === "INSERT" || eventType === "UPDATE") && row) {
          const mapped = mapClientRow(row);
          if (mapped.deleted) {
            setClients(prev => prev.filter(c => c.id !== mapped.id));
            setDeletedClients(prev => {
              const exists = prev.find(c => c.id === mapped.id);
              return exists
                ? prev.map(c => c.id === mapped.id ? { ...c, ...mapped } : c)
                : [mapped, ...prev];
            });
            return;
          }
          setDeletedClients(prev => prev.filter(c => c.id !== mapped.id));
          setClients(prev => {
            const exists = prev.find(c => c.id === mapped.id);
            return exists
              ? prev.map(c => c.id === mapped.id ? { ...c, ...mapped } : c)
              : [...prev, mapped];
          });
        } else if (eventType === "DELETE") {
          setClients(prev => prev.filter(c => c.id !== old.id));
          setDeletedClients(prev => prev.filter(c => c.id !== old.id));
        }
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
    const price = getClientEffectiveSalePrice(client);
    if (paid === 0)    return "unpaid";
    if (paid >= price) return "cleared";
    return "partial";
  }, [getClientTotalPaid]);
  const getProgramById    = useCallback((id) => programs.find(p => p.id === id), [programs]);
  const getProgramClients = useCallback((id) => clients.filter(c => c.programId === id), [clients]);
  const getLinkedPaymentsForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    if (!ids.length) return [];

    if (!isSupabaseEnabled || !agencyId) {
      const idSet = new Set(ids);
      return [...payments, ...deletedPayments].filter((payment) => idSet.has(getPaymentClientId(payment)));
    }

    const { data, error } = await supabase
      .from("payments")
      .select("id, client_id, status, trashed_at, deleted_at")
      .eq("agency_id", agencyId)
      .in("client_id", ids);
    if (error) {
      console.error("[Store] Failed to inspect linked payments before permanent delete:", error);
      throw error;
    }
    return data || [];
  }, [agencyId, deletedPayments, isSupabaseEnabled, payments]);

  const getLinkedInvoicesForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    if (!ids.length || !isSupabaseEnabled || !agencyId) return [];

    const { data, error } = await supabase
      .from("invoices")
      .select("id, client_id, status")
      .eq("agency_id", agencyId)
      .in("client_id", ids);
    if (error) {
      console.error("[Store] Failed to inspect linked invoices before permanent delete:", error);
      throw error;
    }
    return data || [];
  }, [agencyId, isSupabaseEnabled]);

  const getRepresentationLinksForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    if (!ids.length || !isSupabaseEnabled || !agencyId) return [];

    const { data, error } = await supabase
      .from("clients")
      .select("id, represented_by_client_id")
      .eq("agency_id", agencyId)
      .in("represented_by_client_id", ids);
    if (error) {
      console.error("[Store] Failed to inspect client representation links before permanent delete:", error);
      throw error;
    }
    return data || [];
  }, [agencyId, isSupabaseEnabled]);

  const getClientTargetNotificationsForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    if (!ids.length || !isSupabaseEnabled || !agencyId) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("id, target_id")
      .eq("agency_id", agencyId)
      .eq("target_type", "client")
      .in("target_id", ids);
    if (error) {
      console.error("[Store] Failed to inspect client notifications before permanent delete:", error);
      throw error;
    }
    return data || [];
  }, [agencyId, isSupabaseEnabled]);

  const getRoomingAssignmentsForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    if (!ids.length || !isSupabaseEnabled || !agencyId) return [];

    const { data, error } = await supabase
      .from("rooming_assignments")
      .select("id, rooms, unassigned")
      .eq("agency_id", agencyId);
    if (error) {
      console.error("[Store] Failed to inspect rooming assignments before permanent delete:", error);
      throw error;
    }
    const rows = Array.isArray(data) ? data : [];
    return ids.flatMap((clientId) => (
      rows
        .filter((assignment) => roomingRecordContainsClient(assignment, clientId))
        .map((assignment) => ({ id: assignment.id, clientId }))
    ));
  }, [agencyId, isSupabaseEnabled]);

  const getActivePaymentCountsForClientIds = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    const counts = new Map(ids.map((id) => [id, 0]));
    if (!ids.length) return counts;

    const linkedPayments = await getLinkedPaymentsForClientIds(ids);
    linkedPayments.forEach((payment) => {
      if (!isActiveLinkedPayment(payment)) return;
      const clientId = getPaymentClientId(payment);
      if (!counts.has(clientId)) return;
      counts.set(clientId, (counts.get(clientId) || 0) + 1);
    });
    return counts;
  }, [getLinkedPaymentsForClientIds]);

  const callPermanentDeleteClientFunction = useCallback(async (clientId, extraPayload = {}) => {
    if (!isSupabaseEnabled || !agencyId || !clientId) return { error: null };
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { error: sessionError };
    const token = sessionData?.session?.access_token;
    if (!token) return { error: { message: "Missing auth session", status: 401 } };

    const response = await fetch("/.netlify/functions/permanent-delete-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clientId, agencyId, type: "client", ...extraPayload }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return {
        error: {
          message: payload?.error || payload?.message || "Permanent delete failed",
          code: payload?.code || response.status,
          status: response.status,
          details: payload,
        },
      };
    }
    return { data: payload, error: null };
  }, [agencyId, isSupabaseEnabled]);

  const inspectClientPermanentDeleteRemote = useCallback((clientId) => (
    callPermanentDeleteClientFunction(clientId, { dryRun: true })
  ), [callPermanentDeleteClientFunction]);

  const getClientPermanentDeleteBlockMap = useCallback(async (clientIds = []) => {
    const ids = Array.from(new Set((clientIds || []).filter(Boolean)));
    const summaries = new Map(ids.map((id) => [id, {
      clientId: id,
      blocked: false,
      code: "",
      activePaymentCount: 0,
      inactivePaymentCount: 0,
      paymentCount: 0,
      activeInvoiceCount: 0,
      inactiveInvoiceCount: 0,
      invoiceCount: 0,
      hiddenPaymentCount: 0,
      hiddenInvoiceCount: 0,
      representationLinkCount: 0,
      notificationCount: 0,
      roomingAssignmentCount: 0,
      hasSafeCleanup: false,
      reasons: [],
      cleanupReasons: [],
      inactivePaymentIds: [],
    }]));
    if (!ids.length) return summaries;

    if (isSupabaseEnabled && agencyId) {
      const cacheEntries = [];
      const missingIds = [];
      ids.forEach((clientId) => {
        const cacheKey = `${agencyId}:${clientId}`;
        if (clientPermanentDeletePreflightCacheRef.current.has(cacheKey)) {
          cacheEntries.push([clientId, clientPermanentDeletePreflightCacheRef.current.get(cacheKey)]);
        } else {
          missingIds.push(clientId);
        }
      });

      if (!missingIds.length) return new Map(cacheEntries);

      try {
        const { data, error } = await db.clients.fetchDeletedRelatedCounts(agencyId, missingIds);
        if (error) throw error;
        const rowsByClientId = new Map((data || []).map((row) => [String(row.clientId || row.client_id || ""), row]));
        const rpcEntries = missingIds.map((clientId) => {
          const block = normalizeBatchedClientDeleteCheck(clientId, rowsByClientId.get(String(clientId)) || null);
          clientPermanentDeletePreflightCacheRef.current.set(`${agencyId}:${clientId}`, block);
          return [clientId, block];
        });
        return new Map([...cacheEntries, ...rpcEntries]);
      } catch (error) {
        console.error("[Store] Batched permanent delete preflight failed; falling back to per-client dry-run:", error);
        const checks = await Promise.all(missingIds.map(async (clientId) => {
          const response = await inspectClientPermanentDeleteRemote(clientId);
          let block;
          if (response?.error) {
            const code = String(response.error.code || "");
            if (CLIENT_PERMANENT_DELETE_BLOCK_CODES.has(code)) {
              block = normalizeRemoteClientDeleteCheck(clientId, {
                ...(response.error.details || {}),
                blocked: true,
                canDelete: false,
                code,
                error: response.error.message || "",
              });
            } else {
              block = {
                ...summaries.get(clientId),
                blocked: false,
                code: "CHECK_UNAVAILABLE",
                precheckUnavailable: true,
                message: response.error.message || "",
              };
            }
          } else {
            block = normalizeRemoteClientDeleteCheck(clientId, response.data || {});
          }
          clientPermanentDeletePreflightCacheRef.current.set(`${agencyId}:${clientId}`, block);
          return [clientId, block];
        }));
        return new Map([...cacheEntries, ...checks]);
      }
    }

    const [linkedPayments, linkedInvoices, representationLinks, notifications, roomingAssignments] = await Promise.all([
      getLinkedPaymentsForClientIds(ids),
      getLinkedInvoicesForClientIds(ids),
      getRepresentationLinksForClientIds(ids),
      getClientTargetNotificationsForClientIds(ids),
      getRoomingAssignmentsForClientIds(ids),
    ]);

    linkedPayments.forEach((payment) => {
      const clientId = getPaymentClientId(payment);
      const summary = summaries.get(clientId);
      if (!summary) return;
      summary.paymentCount += 1;
      if (payment.id) summary.inactivePaymentIds.push(payment.id);
      if (isActiveLinkedPayment(payment)) summary.activePaymentCount += 1;
      else summary.inactivePaymentCount += 1;
    });

    linkedInvoices.forEach((invoice) => {
      const clientId = String(invoice.client_id || invoice.clientId || "").trim();
      const summary = summaries.get(clientId);
      if (!summary) return;
      summary.invoiceCount += 1;
      if (isActiveLinkedInvoice(invoice)) summary.activeInvoiceCount += 1;
      else summary.inactiveInvoiceCount += 1;
    });

    representationLinks.forEach((link) => {
      const clientId = String(link.represented_by_client_id || link.representedByClientId || "").trim();
      const summary = summaries.get(clientId);
      if (!summary) return;
      summary.representationLinkCount += 1;
    });

    notifications.forEach((notification) => {
      const clientId = String(notification.target_id || notification.targetId || "").trim();
      const summary = summaries.get(clientId);
      if (!summary) return;
      summary.notificationCount += 1;
    });

    roomingAssignments.forEach((assignment) => {
      const clientId = String(assignment.clientId || "").trim();
      const summary = summaries.get(clientId);
      if (!summary) return;
      summary.roomingAssignmentCount += 1;
    });

    summaries.forEach((summary) => {
      if (summary.activePaymentCount > 0) {
        summary.cleanupReasons.push({ code: "DELETE_LINKED_PAYMENTS", count: summary.activePaymentCount });
      }
      if (summary.inactivePaymentCount > 0) {
        summary.cleanupReasons.push({ code: "DELETE_LINKED_PAYMENTS", count: summary.inactivePaymentCount });
      }
      if (summary.activeInvoiceCount > 0) {
        summary.cleanupReasons.push({ code: "DELETE_LINKED_INVOICES", count: summary.activeInvoiceCount });
      }
      if (summary.inactiveInvoiceCount > 0) {
        summary.cleanupReasons.push({ code: "DELETE_LINKED_INVOICES", count: summary.inactiveInvoiceCount });
      }
      if (summary.representationLinkCount > 0) {
        summary.cleanupReasons.push({ code: "CLEANUP_REPRESENTATION_LINKS", count: summary.representationLinkCount });
      }
      if (summary.roomingAssignmentCount > 0) {
        summary.cleanupReasons.push({ code: "CLEANUP_ROOMING_ASSIGNMENTS", count: summary.roomingAssignmentCount });
      }
      if (summary.notificationCount > 0) {
        summary.cleanupReasons.push({ code: "CLEANUP_NOTIFICATIONS", count: summary.notificationCount });
      }
      summary.blocked = summary.reasons.length > 0;
      summary.hasSafeCleanup = summary.cleanupReasons.length > 0;
      if (!summary.blocked) {
        summary.code = summary.hasSafeCleanup ? "DELETE_LINKED_RECORDS_AFTER_CONFIRMATION" : "";
        return;
      }
      if (summary.activePaymentCount > 0 && summary.activeInvoiceCount > 0) summary.code = "ACTIVE_LINKED_FINANCIAL_RECORDS";
      else if (summary.activePaymentCount > 0) summary.code = "ACTIVE_LINKED_PAYMENTS";
      else summary.code = "ACTIVE_LINKED_INVOICES";
    });

    return summaries;
  }, [agencyId, getClientTargetNotificationsForClientIds, getLinkedInvoicesForClientIds, getLinkedPaymentsForClientIds, getRepresentationLinksForClientIds, getRoomingAssignmentsForClientIds, inspectClientPermanentDeleteRemote, isSupabaseEnabled]);

  const permanentlyDeleteClientRemote = useCallback(async (clientId) => {
    return callPermanentDeleteClientFunction(clientId, {
      confirmPermanentDelete: true,
      confirmLinkedRecords: true,
    });
  }, [callPermanentDeleteClientFunction]);

  // ── Stats (operational clients only) ──────────────────────────────────────
  const localStats = useMemo(() => {
    if (isSupabaseEnabled && dashboardStats) return null;
    // Build paid lookup map once — O(n) over payments instead of O(n²)
    const paidMap = new Map();
    payments.forEach(p => {
      paidMap.set(p.clientId, (paidMap.get(p.clientId) || 0) + p.amount);
    });
    const getPaid = (clientId) => paidMap.get(clientId) || 0;
    const getStatus = (client) => {
      const paid  = getPaid(client.id);
      const price = getClientEffectiveSalePrice(client);
      if (paid === 0)    return "unpaid";
      if (paid >= price) return "cleared";
      return "partial";
    };
    const operationalClients = activeClients.filter(c => !c.deleted);
    return {
      totalClients:   operationalClients.length,
      archivedCount:  0,
      totalPrograms:  programs.length,
      cleared:        operationalClients.filter(c => getStatus(c) === "cleared").length,
      partial:        operationalClients.filter(c => getStatus(c) === "partial").length,
      unpaid:         operationalClients.filter(c => getStatus(c) === "unpaid").length,
      totalRevenue:   operationalClients.reduce((s,c) => s + getClientEffectiveSalePrice(c), 0),
      totalCollected: operationalClients.reduce((s,c) => s+getPaid(c.id), 0),
      totalRemaining: operationalClients.reduce((s,c) => s + getClientRemainingAmount(c, getPaid(c.id)), 0),
      totalDiscount:  operationalClients.reduce((s,c) => s + Math.max(0, getClientEffectiveOfficialPrice(c) - getClientEffectiveSalePrice(c)), 0),
      docsIncomplete: operationalClients.filter(c => c.docs && Object.values(c.docs).some(v => !v)).length,
      programClientCounts: operationalClients.reduce((acc, client) => {
        if (client.programId) acc[client.programId] = (acc[client.programId] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [activeClients, programs, payments, isSupabaseEnabled, dashboardStats]);

  const stats = useMemo(() => (
    isSupabaseEnabled && dashboardStats
      ? { ...EMPTY_DASHBOARD_STATS, ...dashboardStats }
      : (localStats || EMPTY_DASHBOARD_STATS)
  ), [dashboardStats, isSupabaseEnabled, localStats]);

  // ── Archive suggestions ───────────────────────────────────────────────────
  const getArchiveSuggestions = useCallback(() => {
    const today = new Date();
    return programs
      .map(p => {
        const ret = p.returnDate ? new Date(p.returnDate) : (p.departure ? new Date(p.departure) : null);
        if (!ret) return null;
        const daysAgo = Math.floor((today - ret) / (1000*60*60*24));
        if (daysAgo <= 30) return null;
        const active = activeClients.filter(c => c.programId === p.id);
        if (active.length === 0) return null;
        if (!active.every((client) => getClientStatus(client) === "cleared")) return null;
        return { program: p, daysAgo, count: active.length };
      })
      .filter(Boolean);
  }, [programs, activeClients, getClientStatus]);

  useEffect(() => {
    if (!storeHydrated) return;
    if (isSupabaseEnabled && (!clientsLoaded || !paymentsLoaded || !notificationsLoaded)) return;
    const activeKeys = new Set();
    const track = (notif) => {
      const key = getNotificationKey(notif);
      activeKeys.add(key);
      ensureNotificationExists({
        ...notif,
        targetType: notif.targetType ?? (notif.programId ? "program" : null),
        targetId: notif.targetId ?? notif.programId ?? null,
      });
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
          targetType: "program",
          targetId: program.id,
          actionRoute: "programs",
          stateHash: `seat_low:${seatsLeft}`,
          meta: { seatsLeft },
        });
      }
      if (seats > 0 && seatsLeft <= 0) {
        track({
          type: "system:seat_full",
          title: program.name,
          message: "Program is full",
          severity: "critical",
          programId: program.id,
          targetType: "program",
          targetId: program.id,
          actionRoute: "programs",
          stateHash: "seat_full",
          meta: { seats },
        });
      }
      const departureDate = getProgramDepartureDate(program);
      if (departureDate) {
        const daysLeft = getDaysUntil(departureDate);
        if (daysLeft !== null && daysLeft > 0 && daysLeft <= 7) {
          const unsettled = assigned.filter(c => getClientStatus(c) !== "cleared");
          if (unsettled.length > 0) {
            track({
              type: "system:unsettled",
              title: program.name,
              message: `${unsettled.length} clients not cleared before departure`,
              severity: "critical",
              programId: program.id,
              targetType: "program",
              targetId: program.id,
              actionRoute: "programs",
              stateHash: `unsettled:${daysLeft}:${unsettled.length}`,
              meta: { daysLeft, unsettled: unsettled.length },
            });
          }
        }
      }
    });

    buildSystemNotificationCandidates({
      programs,
      clients: activeClients,
      getClientName: getClientDisplayName,
      defaultTitle: trKey("notificationsDefaultTitle", getUiLang()),
      defaultProgramName: trKey("noHotel", getUiLang()),
    }).forEach(track);

    getArchiveSuggestions().forEach(({ program, daysAgo, count }) => {
      track({
        type: "system:archive_due",
        title: program.name,
        message: `Program ended ${daysAgo} days ago — ${count} active pilgrims`,
        severity: "info",
        programId: program.id,
        targetType: "program",
        targetId: program.id,
        actionRoute: "programs",
        stateHash: `archive:${daysAgo}:${count}`,
        meta: { daysAgo, count },
      });
    });

    notifications.forEach((notif) => {
      if (notif.isArchived) return;
      if (!notif.type || !notif.type.startsWith("system:")) return;
      const key = getNotificationKey(notif);
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
    clientsLoaded,
    paymentsLoaded,
    notificationsLoaded,
  ]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addClient = useCallback((data) => {
    const id  = trimString(data.id) || genId("CL");
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
    addClientLocal(newClient);
    logActivity("client_add", translateActivityDescription("تم تسجيل معتمر جديد"), newClient.name);
    sync(() => saveClient(newClient, agencyId));
    return id;
  }, [addClientLocal, logActivity, sync, agencyId]);

  const addClientFromPassportImport = useCallback(async (data) => {
    const id  = trimString(data.id) || genId("CL");
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
    if (isSupabaseEnabled && agencyId) {
      const { error } = await saveClient(newClient, agencyId);
      if (error) return { data: null, error };
    }
    addClientLocal(newClient);
    logActivity("client_add", translateActivityDescription("تم تسجيل معتمر جديد"), newClient.name);
    if (!isSupabaseEnabled || !agencyId) sync(() => saveClient(newClient, agencyId));
    return { data: newClient, error: null };
  }, [addClientLocal, agencyId, logActivity, sync]);

  const updateClientFromPassportImport = useCallback(async (id, data) => {
    const now      = new Date().toISOString().split("T")[0];
    const prepared = prepareClientForSave(data);
    const updated  = { ...prepared, id, lastModified: now };
    if (isSupabaseEnabled && agencyId) {
      const { error } = await saveClient(updated, agencyId);
      if (error) return { data: null, error };
    }
    updateClientLocal(id, updated);
    logActivity("client_update", translateActivityDescription("تم تعديل ملف المعتمر"), getClientDisplayName(updated, id));
    if (!isSupabaseEnabled || !agencyId) sync(() => saveClient(updated, agencyId));
    return { data: updated, error: null };
  }, [agencyId, logActivity, sync, updateClientLocal]);

  const updateClient = useCallback((id, data) => {
    const now      = new Date().toISOString().split("T")[0];
    const prepared = prepareClientForSave(data);
    const updated  = { ...prepared, lastModified: now };
    const previous = clients.find(c => c.id === id);
    if (getClientIdentityName(previous) && !getClientIdentityName(updated)) {
      notify(trKey("nameEmptyGuard") || "تم إيقاف حفظ ملف المعتمر لأن الاسم سيصبح فارغًا", "error");
      return;
    }
    updateClientLocal(id, updated);
    if (previous && previous.programId !== updated.programId) {
      const programName = programs.find(p => p.id === updated.programId)?.name || updated.programId || "";
      logActivity("client_transfer", translateActivityDescription(`تم نقل المعتمر إلى ${programName}`), getClientDisplayName(updated, id));
    } else {
      logActivity("client_update", translateActivityDescription("تم تعديل ملف المعتمر"), getClientDisplayName(updated, id));
    }
    sync(() => saveClient({ id, ...updated }, agencyId));
  }, [clients, programs, updateClientLocal, logActivity, sync, agencyId, notify]);

  const syncRoomingClientFields = useCallback(async (programId, updates = []) => {
    if (!programId || !Array.isArray(updates) || !updates.length) {
      return { updatedCount: 0, skippedCount: Array.isArray(updates) ? updates.length : 0, error: null };
    }
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const seen = new Set();
    const updatedClients = [];
    let skippedCount = 0;

    updates.forEach((entry) => {
      const id = entry?.id;
      if (!id || seen.has(id)) {
        skippedCount += 1;
        return;
      }
      seen.add(id);
      const current = clientsById.get(id);
      if (!current || String(current.programId || "") !== String(programId || "")) {
        skippedCount += 1;
        return;
      }
      const patch = entry.patch && typeof entry.patch === "object" ? entry.patch : {};
      const prepared = prepareClientForSave({
        ...current,
        ...patch,
        id: current.id,
        programId: current.programId,
      });
      const updated = {
        ...prepared,
        id: current.id,
        registrationDate: current.registrationDate,
        lastModified: current.lastModified,
        archived: current.archived,
        archivedAt: current.archivedAt,
      };
      if (getClientIdentityName(current) && !getClientIdentityName(updated)) {
        skippedCount += 1;
        return;
      }
      updatedClients.push(updated);
    });

    if (!updatedClients.length) {
      return { updatedCount: 0, skippedCount, error: null };
    }

    updatedClients.forEach((client) => updateClientLocal(client.id, client));

    if (isSupabaseEnabled && agencyId) {
      const responses = await Promise.all(updatedClients.map((client) => saveClient(client, agencyId)));
      const error = responses.find((response) => response?.error)?.error ?? null;
      if (error) return { updatedCount: updatedClients.length, skippedCount, error };
    }

    return { updatedCount: updatedClients.length, skippedCount, error: null };
  }, [agencyId, clients, updateClientLocal]);

  const transferClients = useCallback((ids, programId) => {
    if (!Array.isArray(ids) || ids.length === 0 || !programId) return 0;
    const idSet = new Set(ids);
    const affected = clients.filter((c) => idSet.has(c.id));
    if (!affected.length) return 0;
    const now = new Date().toISOString().split("T")[0];
    const updatedClients = affected.map((client) => ({
      ...client,
      programId,
      lastModified: now,
    }));
    const unsafe = updatedClients.find((updated) => {
      const original = affected.find((client) => client.id === updated.id);
      return getClientIdentityName(original) && !getClientIdentityName(updated);
    });
    if (unsafe) {
      notify(trKey("transferNameEmptyGuard") || "تم إيقاف النقل لحماية بيانات المعتمر: الاسم سيصبح فارغًا بعد النقل", "error");
      return 0;
    }
    transferClientsLocal(ids, programId, now);
    const programName = programs.find((p) => p.id === programId)?.name || programId;
    affected.forEach((client) => {
      logActivity("client_transfer", translateActivityDescription(`تم نقل المعتمر إلى ${programName}`), getClientDisplayName(client, client.id));
    });
    sync(async () => {
      const responses = await Promise.all(
        updatedClients.map((client) => saveClient(client, agencyId))
      );
      const error = responses.find((r) => r?.error)?.error ?? null;
      return { error };
    });
    return affected.length;
  }, [clients, programs, transferClientsLocal, logActivity, sync, agencyId, notify]);

  const deleteClient = useCallback((id) => {
    const client = clients.find((x) => x.id === id);
    if (!client) return;
    const batchId   = generateUUID();
    const deletedAt = new Date().toISOString();
    softDeleteClientsLocal([client], deletedAt, batchId);
    removePaymentsByClient(id);
    logActivity("client_delete", translateActivityDescription("تم حذف معتمر"), getClientDisplayName(client, id));
    sync(() => markClientsDeleted([id], agencyId, batchId));
  }, [clients, softDeleteClientsLocal, removePaymentsByClient, logActivity, sync, agencyId]);

  const deleteClientsBulk = useCallback((ids) => {
    if (!Array.isArray(ids) || !ids.length) return 0;
    const idSet = new Set(ids);
    const entries = clients.filter((c) => idSet.has(c.id));
    if (!entries.length) return 0;
    const batchId   = generateUUID();
    const deletedAt = new Date().toISOString();
    softDeleteClientsLocal(entries, deletedAt, batchId);
    logActivity(
      "client_bulk_delete",
      translateActivityDescription(`تم نقل ${entries.length} معتمر إلى سلة المحذوفات`),
      ""
    );
    sync(() => markClientsDeleted(ids, agencyId, batchId));
    return entries.length;
  }, [clients, softDeleteClientsLocal, logActivity, sync, agencyId]);

  const createAgencyUser = useCallback(async ({ email, fullName, role = "staff", status = "invited" }) => {
    if (!isSupabaseEnabled || !agencyId) {
      throw new Error("Cloud features are unavailable");
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Missing auth session");
    const response = await fetch("/.netlify/functions/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, fullName, role, status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Failed to create user");
    }
    await refreshAgencyUsers({ force: true });
    return payload;
  }, [agencyId, refreshAgencyUsers, isSupabaseEnabled]);

  const updateAgencyUser = useCallback(async ({ userId, role, status }) => {
    if (!isSupabaseEnabled || !agencyId) {
      throw new Error("Cloud features are unavailable");
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Missing auth session");
    const response = await fetch("/.netlify/functions/update-user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, role, status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Failed to update user");
    }
    await refreshAgencyUsers({ force: true });
    return payload;
  }, [agencyId, refreshAgencyUsers, isSupabaseEnabled]);

  // ── Archive / Restore ─────────────────────────────────────────────────────
  const archiveClient = useCallback((id) => {
    const now = new Date().toISOString();
    archiveClientLocal([id], now);
    const c = clients.find((x) => x.id === id);
    logActivity("client_archive", translateActivityDescription("تم أرشفة المعتمر"), getClientDisplayName(c, id));
    if (c) sync(() => saveClient({ ...c, archived: true, archivedAt: now }, agencyId));
  }, [clients, archiveClientLocal, logActivity, sync, agencyId]);

  const archiveClients = useCallback((ids) => {
    if (!ids?.length) return;
    const now = new Date().toISOString();
    archiveClientLocal(ids, now);
    ids.forEach((id) => {
      const c = clients.find((x) => x.id === id);
      if (c) sync(() => saveClient({ ...c, archived: true, archivedAt: now }, agencyId));
    });
    logActivity("client_bulk_archive", translateActivityDescription(`تمت أرشفة ${ids.length} معتمر`), "");
  }, [clients, archiveClientLocal, sync, agencyId, logActivity]);

  const restoreClient = useCallback((id) => {
    restoreArchivedClientLocal(id);
    const c = clients.find((x) => x.id === id);
    logActivity("client_restore", translateActivityDescription("تمت استعادة المعتمر من الأرشيف"), getClientDisplayName(c, id));
    if (c) sync(() => saveClient({ ...c, archived: false, archivedAt: null }, agencyId));
  }, [clients, restoreArchivedClientLocal, logActivity, sync, agencyId]);

  const archiveProgram = useCallback((programId) => {
    const now        = new Date().toISOString();
    const progClients = activeClients.filter(c => c.programId === programId);
    if (progClients.length === 0) return;
    const ids = progClients.map(c => c.id);
    archiveClientLocal(ids, now);
    progClients.forEach(client => sync(() => saveClient({ ...client, archived: true, archivedAt: now }, agencyId)));
    const program = programs.find(p => p.id === programId);
    logActivity("program_archive", translateActivityDescription(`تم أرشفة برنامج ${program?.name || programId}`), "");
  }, [activeClients, programs, archiveClientLocal, logActivity, sync, agencyId]);

  const addPayment = useCallback(async (data) => {
    const id          = genId("PMT");
    const incomingPaymentType = data.paymentType || data.payment_type || (data.isPreviousPayment ? PAYMENT_TYPE_PREVIOUS : "");
    const isPreviousPayment = isPreviousPaymentRecord({ paymentType: incomingPaymentType, isPreviousPayment: data.isPreviousPayment });
    const autoReceipt = isPreviousPayment ? "" : "REC-" + id.slice(-6).toUpperCase();
    const receiptNo = isPreviousPayment
      ? ""
      : (data.receiptNo || data.receipt_no || data.receiptNumber || data.receipt_number || autoReceipt);
    const chequeNumber = trimString(data.chequeNumber ?? data.cheque_number ?? data.checkNumber ?? data.check_number);
    const paidBy = trimString(data.paidBy ?? data.paid_by);
    const pmt = normalizePaymentRecord({
      ...data, id,
      method: data.method || data.paymentMethod || data.payment_method || "",
      payment_method: data.payment_method || data.method || data.paymentMethod || "",
      receiptNo,
      receipt_no: receiptNo,
      receiptNumber: receiptNo,
      receipt_number: receiptNo,
      date:      data.date || new Date().toISOString().split("T")[0],
      chequeNumber,
      cheque_number: chequeNumber,
      checkNumber: chequeNumber,
      check_number: chequeNumber,
      paidBy,
      paid_by: paidBy,
      notes: data.notes ?? data.note ?? "",
      paymentType: isPreviousPayment ? PAYMENT_TYPE_PREVIOUS : "normal",
      payment_type: isPreviousPayment ? PAYMENT_TYPE_PREVIOUS : "normal",
      isPreviousPayment,
      is_previous_payment: isPreviousPayment,
      legacyReceiptNumber: data.legacyReceiptNumber ?? data.legacy_receipt_number ?? "",
      legacy_receipt_number: data.legacyReceiptNumber ?? data.legacy_receipt_number ?? "",
    });
    const c   = clients.find(x => x.id === data.clientId);
    const now = new Date().toISOString().split("T")[0];

    if (isSupabaseEnabled && agencyId) {
      setSyncStatus("syncing");
      try {
        let savedPayment = null;
        if (isPreviousPayment) {
          const result = await createPreviousPayment(pmt, agencyId);
          if (result.error) throw result.error;
          if (!result.data) throw new Error("Previous payment creation did not return a row");
          savedPayment = result.data;
        } else {
          const result = await createPaymentWithReceipt(pmt, agencyId);
          if (result.error) throw result.error;
          if (!result.data) throw new Error("Payment creation did not return a row");
          savedPayment = result.data;
        }
        addPaymentLocal(savedPayment);
        setClients(prev => prev.map(x => x.id === data.clientId ? { ...x, lastModified: now } : x));
        logActivity(
          "payment_add",
          translateActivityDescription(`دفعة ${formatCurrency(savedPayment.amount, getUiLang())} — ${savedPayment.receiptNo || savedPayment.legacyReceiptNumber || "سابقة"}`),
          c?.name || data.clientId,
          { skipRemote: true }
        );
        const syncedAt = new Date();
        setLastSynced(syncedAt);
        try { localStorage.setItem(`umrah_last_synced_${ns}`, syncedAt.toISOString()); } catch {}
        setSyncStatus("synced");
        return savedPayment;
      } catch (err) {
        console.error("[Store] Payment RPC failed:", err);
        setSyncStatus("offline");
        notify(trKey("storeLocalMode") || "يعمل النظام بالوضع المحلي — تعذّر الاتصال بالسحابة", "error");
        return null;
      }
    }

    addPaymentLocal(pmt);
    setClients(prev => prev.map(x => x.id === data.clientId ? { ...x, lastModified: now } : x));
    logActivity(
      "payment_add",
      translateActivityDescription(`دفعة ${formatCurrency(data.amount, getUiLang())} — ${pmt.receiptNo || pmt.legacyReceiptNumber || "سابقة"}`),
      c?.name || data.clientId,
      { skipRemote: isSupabaseEnabled }
    );
    sync(() => savePayment(pmt, agencyId));
    return pmt;
  }, [clients, addPaymentLocal, setClients, logActivity, sync, agencyId, isSupabaseEnabled, ns, notify]);

  const deletePayment = useCallback((id) => {
    const p = payments.find(x => x.id === id);
    trashPaymentLocal(id);
    logActivity(
      "payment_trash",
      translateActivityDescription(`تم نقل دفعة ${p?.receiptNo || ""} إلى سلة المحذوفات`),
      "",
      { skipRemote: isSupabaseEnabled }
    );
    notify(localizedPaymentTrashMessage(), "success");
    sync(() => deletePaymentRemote(id, agencyId));
  }, [payments, trashPaymentLocal, logActivity, notify, sync, agencyId, isSupabaseEnabled]);

  const restorePaymentFromTrash = useCallback(async (id) => {
    const p = deletedPayments.find(x => x.id === id);
    restorePaymentLocal(id);
    logActivity(
      "payment_restore",
      translateActivityDescription(`تم استرجاع دفعة ${p?.receiptNo || ""}`),
      "",
      { skipRemote: isSupabaseEnabled }
    );
    notify(localizedPaymentRestoreMessage(), "success");
    await sync(() => restorePaymentRemote(id, agencyId));
  }, [agencyId, deletedPayments, isSupabaseEnabled, logActivity, notify, restorePaymentLocal, sync]);

  const deletePaymentFromTrash = useCallback(async (id) => {
    const p = deletedPayments.find(x => x.id === id);
    purgePaymentLocal(id);
    logActivity(
      "payment_delete",
      translateActivityDescription(`تم حذف دفعة نهائيًا ${p?.receiptNo || ""}`),
      "",
      { skipRemote: isSupabaseEnabled }
    );
    await sync(() => deleteTrashedPaymentRemote(id, agencyId));
  }, [agencyId, deletedPayments, isSupabaseEnabled, logActivity, purgePaymentLocal, sync]);

  const addProgram = useCallback((data) => {
    const id  = genId("PRG");
    const prg = { ...data, id, priceTable: data.priceTable || [] };
    setPrograms(prev => [...prev, prg]);
    logActivity("program_add", translateActivityDescription(`تم إضافة برنامج جديد: ${data.name}`), "");
    sync(() => saveProgram(prg, agencyId));
  }, [setPrograms, logActivity, sync, agencyId]);

  const updateProgram = useCallback((id, data) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    logActivity("program_update", translateActivityDescription(`تم تعديل برنامج ${data.name || id}`), "");
    sync(() => saveProgram({ id, ...data }, agencyId));
  }, [setPrograms, logActivity, sync, agencyId]);

  const deleteProgram = useCallback((id) => {
    const prog = programs.find(p => p.id === id);
    if (!prog) return;
    const relatedClients = clients.filter(c => c.programId === id);
    const clientIds = relatedClients.map(c => c.id);
    const batchId = generateUUID();
    const deletedAt = new Date().toISOString();
    const deletedProgramEntry = {
      ...prog,
      deleted: true,
      deletedAt,
      deletedBatchId: batchId,
    };
    setPrograms(prev => prev.filter(p => p.id !== id));
    setDeletedPrograms(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return [deletedProgramEntry, ...filtered];
    });
    if (clientIds.length) {
      softDeleteClientsLocal(relatedClients, deletedAt, batchId);
      removePaymentsByClient(clientIds);
    }
    logActivity("program_delete", translateActivityDescription(`تم حذف برنامج ${prog?.name || id}`), "");
    sync(async () => {
      const responses = [];
      responses.push(await markProgramDeleted(id, agencyId, batchId));
      if (clientIds.length) {
        responses.push(await markClientsDeleted(clientIds, agencyId, batchId));
      }
      const error = responses.find(r => r?.error)?.error ?? null;
      return { error };
    });
  }, [programs, clients, setPrograms, softDeleteClientsLocal, removePaymentsByClient, logActivity, sync, agencyId]);

  const restoreTrashItems = useCallback(({ programIds = [], clientIds = [] }) => {
    if (!programIds.length && !clientIds.length) return;
    const programsToRestore = deletedPrograms.filter(p => programIds.includes(p.id));
    const batchIdsFromPrograms = new Set(
      programsToRestore
        .map(p => p.deletedBatchId)
        .filter(Boolean)
    );
    const clientsFromPrograms = deletedClients
      .filter(c => c.deletedBatchId && batchIdsFromPrograms.has(c.deletedBatchId))
      .map(c => c.id);
    const combinedClientIds = Array.from(new Set([...clientIds, ...clientsFromPrograms]));

    if (programsToRestore.length) {
      const restoredPrograms = programsToRestore.map((prog) => ({
        ...prog,
        deleted: false,
        deletedAt: null,
        deletedBatchId: null,
      }));
      setPrograms(prev => {
        const filtered = prev.filter(p => !programIds.includes(p.id));
        return [...filtered, ...restoredPrograms];
      });
      setDeletedPrograms(prev => prev.filter(p => !programIds.includes(p.id)));
      const label = programsToRestore.length === 1
        ? translateActivityDescription(`تمت استعادة برنامج ${programsToRestore[0].name || programsToRestore[0].id}`)
        : translateActivityDescription(`تمت استعادة ${programsToRestore.length} برامج من سلة المحذوفات`);
      logActivity("program_restore", label, "");
    }

    if (combinedClientIds.length) {
      const restoredClients = deletedClients
        .filter(c => combinedClientIds.includes(c.id))
        .map(c => ({
          ...c,
          deleted: false,
          deletedAt: null,
          deletedBatchId: null,
        }));
      setClients(prev => {
        const filtered = prev.filter(c => !combinedClientIds.includes(c.id));
        return [...filtered, ...restoredClients];
      });
      setDeletedClients(prev => prev.filter(c => !combinedClientIds.includes(c.id)));
      const label = combinedClientIds.length === 1
        ? translateActivityDescription("تمت استعادة معتمر من السلة")
        : translateActivityDescription(`تمت استعادة ${combinedClientIds.length} معتمرين من السلة`);
      logActivity("client_restore", label, "");
      combinedClientIds.forEach((id) => {
        if (agencyId) clientPermanentDeletePreflightCacheRef.current.delete(`${agencyId}:${id}`);
      });
    }

    sync(async () => {
      const responses = [];
      for (const programId of programIds) {
        responses.push(await restoreProgram(programId, agencyId));
      }
      if (combinedClientIds.length) {
        responses.push(await restoreClients(combinedClientIds, agencyId));
      }
      const error = responses.find(r => r?.error)?.error ?? null;
      return { error };
    });
  }, [agencyId, deletedPrograms, deletedClients, logActivity, restoreClients, restoreProgram, sync]);

  const purgeTrashItems = useCallback(async ({ programIds = [], clientIds = [], clientPreflightBlocks = null, onProgress = null } = {}) => {
    if (!programIds.length && !clientIds.length) return { purged: false };
    const programsToPurge = deletedPrograms.filter(p => programIds.includes(p.id));
    const batchIds = new Set(
      programsToPurge
        .map(p => p.deletedBatchId)
        .filter(Boolean)
    );
    const programById = new Map(programsToPurge.map((program) => [program.id, program]));
    const programByBatchId = new Map(
      programsToPurge
        .filter((program) => program.deletedBatchId)
        .map((program) => [program.deletedBatchId, program])
    );
    const linkedDeletedClients = deletedClients.filter((client) => (
      (client.deletedBatchId && batchIds.has(client.deletedBatchId))
      || programIds.includes(client.programId)
    ));
    const linkedActiveClients = clients.filter((client) => programIds.includes(client.programId));
    const linkedClientsById = new Map();
    [...linkedDeletedClients, ...linkedActiveClients].forEach((client) => {
      if (client?.id) linkedClientsById.set(client.id, client);
    });
    const preservedProgramClientIds = new Set(linkedClientsById.keys());
    const finalClientIds = Array.from(new Set(clientIds)).filter((id) => !preservedProgramClientIds.has(id));
    const providedClientBlockMap = clientPreflightBlocks instanceof Map
      ? new Map(clientPreflightBlocks)
      : new Map(Object.entries(clientPreflightBlocks || {}));
    const clientBlockMap = new Map(
      finalClientIds
        .filter((id) => providedClientBlockMap.has(id))
        .map((id) => [id, providedClientBlockMap.get(id)])
    );
    const missingPreflightClientIds = finalClientIds.filter((id) => !clientBlockMap.has(id));
    if (missingPreflightClientIds.length) {
      const fallbackBlockMap = await getClientPermanentDeleteBlockMap(missingPreflightClientIds);
      fallbackBlockMap.forEach((block, clientId) => {
        clientBlockMap.set(clientId, block);
      });
    }
    const preflightBlockedClientIds = finalClientIds.filter((id) => clientBlockMap.get(id)?.blocked);
    const preflightEligibleClientIds = finalClientIds.filter((id) => !clientBlockMap.get(id)?.blocked);
    const snapshotDeletedAt = new Date().toISOString();
    const clientsToPreserve = Array.from(linkedClientsById.values()).map((client) => {
      const program = programById.get(client.programId)
        || programByBatchId.get(client.deletedBatchId)
        || {};
      return {
        ...client,
        programId: null,
        deleted: false,
        deletedAt: null,
        deletedBatchId: null,
        docs: {
          ...(client.docs || {}),
          deletedProgramSnapshot: buildDeletedProgramSnapshot(program, client, snapshotDeletedAt),
        },
      };
    });

    const applyLocalPurge = (clientIdsToPurge = preflightEligibleClientIds) => {
      const purgeClientIdSet = new Set(clientIdsToPurge);
      const cleanupPaymentIds = clientIdsToPurge.flatMap((id) => clientBlockMap.get(id)?.inactivePaymentIds || []);
      clientIdsToPurge.forEach((id) => {
        if (agencyId) clientPermanentDeletePreflightCacheRef.current.delete(`${agencyId}:${id}`);
      });
      setPrograms(prev => prev.filter(p => !programIds.includes(p.id)));
      setDeletedPrograms(prev => prev.filter(p => !programIds.includes(p.id)));
      if (clientsToPreserve.length) {
        const preservedIds = new Set(clientsToPreserve.map((client) => client.id));
        setClients(prev => [
          ...prev.filter(c => !preservedIds.has(c.id) && !purgeClientIdSet.has(c.id)),
          ...clientsToPreserve,
        ]);
        setDeletedClients(prev => prev.filter(c => !preservedIds.has(c.id) && !purgeClientIdSet.has(c.id)));
      } else {
        setClients(prev => prev.filter(c => !purgeClientIdSet.has(c.id)));
        setDeletedClients(prev => prev.filter(c => !purgeClientIdSet.has(c.id)));
      }
      cleanupPaymentIds.forEach((id) => purgePaymentLocal(id));
    };

    const persistPurge = async () => {
      for (const client of clientsToPreserve) {
        const response = await saveClient(client, agencyId);
        if (response?.error) return { error: response.error };
      }
      if (programIds.length) {
        const response = await deleteProgramsPermanent(programIds, agencyId);
        if (response?.error) return { error: response.error };
      }
      const deletedClientIds = [];
      const blockedClientIds = [...preflightBlockedClientIds];
      const failedClientIds = [];
      let cleanedPaymentsCount = 0;
      let cleanedInvoicesCount = 0;
      let cleanedRoomingAssignmentsCount = 0;
      let cleanedNotificationsCount = 0;
      let cleanedRepresentationLinksCount = 0;
      let cleanedBadgePhotosCount = 0;
      const clientBlocks = Object.fromEntries(
        preflightBlockedClientIds.map((id) => [id, clientBlockMap.get(id)])
      );
      if (preflightEligibleClientIds.length) {
        if (isSupabaseEnabled && agencyId) {
          let completedClientDeletes = 0;
          onProgress?.({ done: 0, total: preflightEligibleClientIds.length });
          const clientDeleteResults = await runWithConcurrencyLimit(preflightEligibleClientIds, 3, async (clientId) => {
            try {
              const response = await permanentlyDeleteClientRemote(clientId);
              return { clientId, response };
            } catch (error) {
              return {
                clientId,
                response: {
                  error: {
                    code: "DELETE_FAILED",
                    message: error?.message || "Permanent delete failed",
                    details: error,
                  },
                },
              };
            } finally {
              completedClientDeletes += 1;
              onProgress?.({
                done: completedClientDeletes,
                total: preflightEligibleClientIds.length,
                clientId,
              });
            }
          });
          for (const { clientId, response } of clientDeleteResults) {
            if (response?.error) {
              const code = String(response.error.code || "");
              if (CLIENT_PERMANENT_DELETE_BLOCK_CODES.has(code)) {
                blockedClientIds.push(clientId);
                clientBlocks[clientId] = {
                  clientId,
                  blocked: true,
                  code: response.error.code || "LINKED_RECORDS",
                  message: response.error.message || "",
                  details: response.error.details || null,
                };
                continue;
              }
              failedClientIds.push(clientId);
              clientBlocks[clientId] = {
                clientId,
                blocked: true,
                code: response.error.code || "DELETE_FAILED",
                message: response.error.message || "",
                details: response.error.details || null,
              };
              continue;
            }
            const cleanup = response.data?.cleanup || {};
            cleanedPaymentsCount += Number(cleanup.deletedPaymentsCount || 0);
            cleanedInvoicesCount += Number(cleanup.deletedInvoicesCount || 0);
            cleanedRoomingAssignmentsCount += Number(cleanup.cleanedRoomingAssignmentsCount || 0);
            cleanedNotificationsCount += Number(cleanup.deletedNotificationsCount || 0);
            cleanedRepresentationLinksCount += Number(cleanup.clearedRepresentationLinksCount || 0);
            cleanedBadgePhotosCount += Number(cleanup.deletedBadgePhotosCount || 0);
            deletedClientIds.push(clientId);
          }
        } else {
          const response = await deleteClientsPermanent(preflightEligibleClientIds, agencyId);
          if (response?.error) return { error: response.error };
          deletedClientIds.push(...preflightEligibleClientIds);
        }
      }
      return {
        error: null,
        deletedClientIds,
        blockedClientIds: Array.from(new Set(blockedClientIds)),
        failedClientIds,
        clientBlocks,
        cleanup: {
          cleanedPaymentsCount,
          cleanedInvoicesCount,
          cleanedRoomingAssignmentsCount,
          cleanedNotificationsCount,
          cleanedRepresentationLinksCount,
          cleanedBadgePhotosCount,
        },
      };
    };

    if (isSupabaseEnabled && agencyId) {
      const result = await persistPurge();
      if (result?.error) {
        console.error("[Store] Permanent delete failed:", result.error);
        return { purged: false, error: result.error };
      }
      applyLocalPurge(result.deletedClientIds || []);
      return {
        purged: Boolean(programIds.length || clientsToPreserve.length || result.deletedClientIds?.length),
        deletedClientIds: result.deletedClientIds || [],
        blockedClientIds: result.blockedClientIds || [],
        failedClientIds: result.failedClientIds || [],
        clientBlocks: result.clientBlocks || {},
        cleanup: result.cleanup || {},
      };
    }

    applyLocalPurge(preflightEligibleClientIds);
    sync(persistPurge);
    return {
      purged: Boolean(programIds.length || clientsToPreserve.length || preflightEligibleClientIds.length),
      deletedClientIds: preflightEligibleClientIds,
      blockedClientIds: preflightBlockedClientIds,
      failedClientIds: [],
      clientBlocks: Object.fromEntries(preflightBlockedClientIds.map((id) => [id, clientBlockMap.get(id)])),
      cleanup: {},
    };
  }, [agencyId, clients, deletedPrograms, deletedClients, deleteClientsPermanent, deleteProgramsPermanent, getClientPermanentDeleteBlockMap, isSupabaseEnabled, permanentlyDeleteClientRemote, purgePaymentLocal, saveClient, sync]);

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
        db.agency.update(agencyId, agency),
      ]);
      if (payments.length) {
        console.warn("[Store] Skipped payment upsert during forceSync in Supabase mode; payments are managed through create_payment_with_receipt.");
      }
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
  const getBackupInvoices = useCallback(async () => {
    if (isSupabaseEnabled && agencyId && invoiceApi?.fetchFinalInvoices) {
      const { data, error } = await invoiceApi.fetchFinalInvoices();
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }

    const clientIds = new Set(clients.map((client) => String(client.id || "")));
    const programIds = new Set(programs.map((program) => String(program.id || "")));
    return readSavedInvoices().filter((invoice) => {
      const clientId = String(invoice.clientId || "").trim();
      const programId = String(invoice.programId || "").trim();
      return (clientId && clientIds.has(clientId)) || (programId && programIds.has(programId));
    });
  }, [agencyId, clients, invoiceApi, programs]);

  const getBackupRoomingSnapshots = useCallback(async () => {
    const localSnapshots = collectLocalRoomingBackupSnapshots({ programs, agencyId });
    if (!isSupabaseEnabled || !agencyId) return localSnapshots;

    const remoteResults = await Promise.allSettled(
      programs.flatMap((program) => ["makkah", "madinah"].map(async (location) => {
        const { data, error } = await db.roomingAssignments.fetch(agencyId, program.id, location);
        if (error) {
          console.warn("[Store] Skipped rooming assignment in backup export:", error);
          return null;
        }
        if (!data) return null;
        return {
          source: "remote",
          programId: program.id,
          programName: program.name || "",
          location,
          rooms: Array.isArray(data.rooms) ? data.rooms : [],
          unassigned: Array.isArray(data.unassigned) ? data.unassigned : [],
          roomLinks: Array.isArray(data.meta?.roomLinks) ? data.meta.roomLinks : [],
          updatedAt: data.updatedAt || "",
        };
      }))
    );

    const remoteSnapshots = remoteResults
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value);
    return mergeRoomingBackupSnapshots(remoteSnapshots, localSnapshots);
  }, [agencyId, programs]);

  const downloadBackupBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportData = async () => {
    const [invoices, rooming] = await Promise.all([
      getBackupInvoices(),
      getBackupRoomingSnapshots(),
    ]);
    const payload = buildExportPayload({ programs, clients, payments, agency, invoices, rooming });
    const blob = await buildAgencyBackupArchive({
      payload,
      agency,
      programs,
      clients,
      payments,
      invoices,
      roomingSnapshots: rooming,
      lang: getUiLang(),
    });
    downloadBackupBlob(blob, buildBackupArchiveFilename(agency));
    logActivity("backup_export", translateActivityDescription("تم تصدير نسخة احتياطية كاملة"), "");
  };

  const importData = async (file) => {
    const rawPayload = await readBackupPayloadFromFile(file);
    const parsed = parseImportPayload(rawPayload);
    setPrograms(parsed.programs);
    setClients(parsed.clients);
    setDeletedPrograms([]);
    setDeletedClients([]);
    replacePayments(parsed.payments);
    if (parsed.agency) setAgency(parsed.agency);
    logActivity("backup_import", translateActivityDescription("تم استيراد نسخة احتياطية"), "");
  };

  const dbSyncing = syncStatus === "syncing";
  const effectiveUnreadNotificationsCount = isSupabaseEnabled && !notificationsLoaded && dashboardStats
    ? stats.unreadNotificationsCount
    : unreadNotificationsCount;

  return {
    programs, clients, payments, agency, agencyId, activityLog, stats,
    agencyUsers,
    deletedPrograms, deletedClients, deletedPayments,
    activeClients, archivedClients,
    invoiceApi,
    badgePhotoApi,
    agencyLogoApi,
    notifications,
    unreadNotifications,
    unreadNotificationsCount: effectiveUnreadNotificationsCount,
    dbLoading, dbSyncing, syncStatus, lastSynced, isSupabaseEnabled,
    clientsLoading, clientsLoaded,
    paymentsLoading, paymentsLoaded,
    notificationsLoading, notificationsLoaded,
    usersLoading, usersLoaded,
    backgroundHydrationLoading, backgroundHydrationDone,
    trashLoading, trashLoaded, trashError, loadTrashData,
    paymentsByClient, paidByClient, lastPaymentByClient,
    getClientPayments, getClientTotalPaid, getClientStatus, getActivePaymentCountsForClientIds, getClientPermanentDeleteBlockMap,
    getClientLastPayment, getProgramClients, getProgramById, getArchiveSuggestions,
    addClient, addClientFromPassportImport, updateClient, updateClientFromPassportImport, syncRoomingClientFields, deleteClient, deleteClientsBulk,
    transferClients,
    createAgencyUser,
    updateAgencyUser,
    archiveClient, archiveClients, restoreClient, archiveProgram,
    addPayment, deletePayment, restorePaymentFromTrash, deletePaymentFromTrash,
    addProgram, updateProgram, deleteProgram,
    restoreTrashItems, purgeTrashItems,
    updateAgency, exportData, importData, forceSync, refreshAgencyUsers,
    ensureClientsLoaded: loadClients,
    ensurePaymentsLoaded: loadPayments,
    ensureNotificationsLoaded: loadNotifications,
    markNotificationRead, markAllNotificationsRead, archiveNotification, restoreNotification,
    ensureNotificationExists,
    deleteNotification,
    deleteNotifications,
    deleteAllArchivedNotifications: deleteAllArchived,
    fetchActivityLogPage, clearActivityLog: clearActivityLogConfirmed, recordActivity: logActivity,
  };
}
