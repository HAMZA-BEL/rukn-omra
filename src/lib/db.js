/**
 * db.js — All Supabase CRUD operations with camelCase ↔ snake_case mapping.
 * Every operation explicitly scopes data to the provided agencyId (defense-in-depth
 * on top of Supabase RLS policies).
 */
import { supabase } from "./supabase";
import { buildNotificationStateHash } from "../utils/notifications";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientIdentityName } from "../utils/clientNames";
import { getClientServiceType } from "../utils/clientServiceTypes";

const normalizeForeignKey = (value) => (
  typeof value === "string" && value.trim() ? value : null
);

const UUID_SEARCH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const cleanPostgrestSearch = (value) => (
  typeof value === "string"
    ? value.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ")
    : ""
);

const isMissingRpcError = (error, rpcName) => {
  if (!error) return false;
  const text = [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return text.includes("pgrst202")
    || (text.includes(rpcName.toLowerCase()) && text.includes("schema cache"))
    || (text.includes(rpcName.toLowerCase()) && text.includes("could not find"));
};

const fetchPagedRows = async (buildQuery, pageSize = 1000) => {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) return { data: rows, error: null };
    from += pageSize;
  }
};

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const parseRpcJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeDashboardProgramCounts = (counts = {}) => {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return {};
  return Object.entries(counts).reduce((acc, [programId, count]) => {
    if (programId) acc[programId] = toFiniteNumber(count);
    return acc;
  }, {});
};

const normalizeDashboardSummary = (summary = {}) => {
  const source = parseRpcJson(summary) || {};
  return {
    totalClients: toFiniteNumber(source.active_clients_count),
    archivedCount: 0,
    totalPrograms: toFiniteNumber(source.active_programs_count),
    cleared: toFiniteNumber(source.cleared_count ?? source.fully_paid_count),
    partial: toFiniteNumber(source.partial_paid_count),
    unpaid: toFiniteNumber(source.unpaid_count),
    totalRevenue: toFiniteNumber(source.total_sales_amount ?? source.expected_total),
    totalCollected: toFiniteNumber(source.total_paid),
    totalRemaining: toFiniteNumber(source.total_remaining),
    totalDiscount: toFiniteNumber(source.total_discount),
    docsIncomplete: toFiniteNumber(source.incomplete_info_count),
    programClientCounts: normalizeDashboardProgramCounts(source.program_client_counts),
    hajjClientsCount: toFiniteNumber(source.hajj_clients_count),
    umrahClientsCount: toFiniteNumber(source.umrah_clients_count),
    unreadNotificationsCount: toFiniteNumber(source.unread_notifications_count),
  };
};

const composeClientName = (row) => {
  const first = typeof row.first_name === "string" ? row.first_name.trim() : "";
  const last  = typeof row.last_name === "string" ? row.last_name.trim() : "";
  const arabic = [first, last].filter(Boolean).join(" ").trim();
  if (arabic) return arabic;
  if (typeof row.name === "string" && row.name.trim()) return row.name.trim();
  const latin = [row.nom, row.prenom]
    .map(v => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" / ");
  return latin || "";
};

const normalizeGender = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "male" || normalized === "m" || normalized === "ذكر") return "male";
  if (normalized === "female" || normalized === "f" || normalized === "أنثى") return "female";
  return "";
};

const toPassportGender = (gender) => {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "";
};

// ─── Mappers: app (camelCase) ↔ Supabase (snake_case) ────────────────────────

const toProgram = (p, agencyId) => ({
  id:           p.id,
  agency_id:    agencyId,
  name:         p.name,
  name_fr:      p.nameFr       ?? null,
  type:         p.type         ?? null,
  duration:     p.duration     ?? null,
  departure:    p.departure    ?? null,
  return_date:  p.returnDate   ?? null,
  transport:    p.transport    ?? null,
  meal_plan:    p.mealPlan     ?? null,
  seats:        p.seats        ?? 40,
  hotel_mecca:  p.hotelMecca   ?? null,
  hotel_madina: p.hotelMadina  ?? null,
  badge_guide_phone:   p.guidePhone   ?? null,
  badge_saudi_phone_1: p.saudiPhone1  ?? null,
  badge_saudi_phone_2: p.saudiPhone2  ?? null,
  badge_note:          p.badgeNote    ?? null,
  badge_template_id:   p.badgeTemplateId ?? null,
  price_table:  p.priceTable   ?? [],
  notes:        p.notes        ?? null,
  deleted:      p.deleted      ?? false,
  deleted_at:   p.deletedAt    ?? null,
  deleted_batch_id: p.deletedBatchId ?? null,
  status:       p.status       ?? "active",
  updated_at:   new Date().toISOString(),
});

const fromProgram = (row) => ({
  id:          row.id,
  name:        row.name,
  nameFr:      row.name_fr,
  type:        row.type,
  duration:    row.duration,
  departure:   row.departure,
  returnDate:  row.return_date,
  transport:   row.transport,
  mealPlan:    row.meal_plan,
  seats:       row.seats,
  hotelMecca:  row.hotel_mecca,
  hotelMadina: row.hotel_madina,
  guidePhone:  row.badge_guide_phone || "",
  saudiPhone1: row.badge_saudi_phone_1 || "",
  saudiPhone2: row.badge_saudi_phone_2 || "",
  badgeNote:   row.badge_note || "",
  badgeTemplateId: row.badge_template_id || "",
  priceTable:  row.price_table ?? [],
  notes:       row.notes,
  deleted:     row.deleted ?? false,
  deletedAt:   row.deleted_at,
  deletedBatchId: row.deleted_batch_id,
  status:      row.status,
});

const toClient = (c, agencyId) => {
  const normalizedGender = normalizeGender(c.gender || c.passport?.gender);
  const serviceType = getClientServiceType(c);
  const rooming = c.docs?.rooming || (
    c.roomingGroupId || c.roomCategory
      ? {
          groupId: cleanString(c.roomingGroupId),
          groupName: cleanString(c.roomingGroupName),
          category: cleanString(c.roomCategory),
          categoryLabel: cleanString(c.roomCategoryLabel),
          groupSize: Number(c.roomingGroupSize || 0),
          seatIndex: Number(c.roomingSeatIndex || 0),
        }
      : null
  );
  const badgePhotoPath = cleanString(c.badgePhotoPath ?? c.docs?.badgePhotoPath);
  const passport = {
    ...(c.passport ?? {}),
    cin: cleanString(c.cin ?? c.nationalId ?? c.passport?.cin ?? c.passport?.nationalId),
    gender: toPassportGender(normalizedGender),
  };
  return {
  id:                c.id,
  agency_id:         agencyId,
  program_id:        normalizeForeignKey(c.programId),
  name:              cleanString(getClientIdentityName(c)),
  first_name:        cleanString(c.firstName),
  last_name:         cleanString(c.lastName),
  nom:               cleanString(c.nom),
  prenom:            cleanString(c.prenom),
  phone:             cleanString(c.phone),
  registration_source: cleanString(c.registrationSource ?? c.registration_source ?? c.sourceRegistration ?? c.source),
  city:              cleanString(c.city),
  hotel_level:       cleanString(c.packageLevel ?? c.hotelLevel),
  hotel_mecca:       cleanString(c.hotelMecca),
  hotel_madina:      cleanString(c.hotelMadina),
  room_type:         cleanString(c.roomType),
  official_price:    c.officialPrice    ?? 0,
  sale_price:        c.salePrice        ?? c.price ?? 0,
  ticket_no:         cleanString(c.ticketNo),
  represented_by_client_id: normalizeForeignKey(c.representedByClientId ?? c.represented_by_client_id ?? c.guardianClientId ?? c.guardian_client_id),
  represented_by_relationship: cleanString(c.representedByRelationship ?? c.represented_by_relationship ?? c.guardianRelationship ?? c.guardian_relationship),
  passport:          passport,
  docs:              { ...(c.docs ?? {}), serviceType, ...(badgePhotoPath ? { badgePhotoPath } : {}), ...(rooming ? { rooming } : {}) },
  notes:             cleanString(c.notes),
  registration_date: c.registrationDate ?? null,
  last_modified:     c.lastModified     ?? null,
  archived:          c.archived         ?? false,
  archived_at:       c.archivedAt       ?? null,
  deleted:           c.deleted          ?? false,
  deleted_at:        c.deletedAt        ?? null,
  deleted_batch_id:  c.deletedBatchId   ?? null,
  };
};

const fromClient = (row) => {
  const gender = normalizeGender(row.gender || row.passport?.gender);
  const serviceType = getClientServiceType({ docs: row.docs });
  const rooming = row.docs?.rooming || {};
  return {
  id:               row.id,
  programId:        row.program_id,
  name:             composeClientName(row),
  firstName:        row.first_name,
  lastName:         row.last_name,
  nom:              row.nom,
  prenom:           row.prenom,
  phone:            row.phone,
  registrationSource: row.registration_source,
  registration_source: row.registration_source,
  cin:              row.passport?.cin || row.passport?.nationalId || "",
  city:             row.city,
  hotelLevel:       row.hotel_level,
  packageLevel:     row.hotel_level,
  hotelMecca:       row.hotel_mecca,
  hotelMadina:      row.hotel_madina,
  roomType:         row.room_type,
  roomTypeLabel:    getRoomTypeLabel(row.room_type),
  serviceType,
  roomingGroupId:   rooming.groupId || "",
  roomingGroupName: rooming.groupName || "",
  roomCategory:     rooming.category || "",
  roomCategoryLabel: rooming.categoryLabel || "",
  roomingGroupSize: Number(rooming.groupSize || 0),
  roomingSeatIndex: Number(rooming.seatIndex || 0),
  gender,
  officialPrice:    Number(row.official_price ?? 0),
  salePrice:        Number(row.sale_price ?? 0),
  ticketNo:         row.ticket_no,
  representedByClientId: row.represented_by_client_id || row.docs?.representedByClientId || "",
  represented_by_client_id: row.represented_by_client_id || row.docs?.representedByClientId || "",
  representedByRelationship: row.represented_by_relationship || row.docs?.representedByRelationship || "",
  represented_by_relationship: row.represented_by_relationship || row.docs?.representedByRelationship || "",
  passport:         row.passport ?? {},
  docs:             { ...(row.docs ?? {}), serviceType },
  badgePhotoPath:   row.docs?.badgePhotoPath || "",
  notes:            row.notes,
  registrationDate: row.registration_date,
  lastModified:     row.last_modified,
  archived:         row.archived   ?? false,
  archivedAt:       row.archived_at ?? null,
  deleted:          row.deleted ?? false,
  deletedAt:        row.deleted_at,
  deletedBatchId:   row.deleted_batch_id,
  };
};

const toPayment = (p, agencyId) => ({
  id:         p.id,
  agency_id:  agencyId,
  client_id:  normalizeForeignKey(p.clientId),
  amount:     p.amount,
  date:       p.date      ?? null,
  method:     p.method ?? p.paymentMethod ?? p.payment_method ?? null,
  receipt_no: p.receiptNo ?? p.receipt_no ?? p.receiptNumber ?? p.receipt_number ?? null,
  receipt_sequence: p.receiptSequence ?? p.receipt_sequence ?? null,
  cheque_number: cleanString(p.chequeNumber ?? p.cheque_number ?? p.checkNumber ?? p.check_number),
  paid_by: cleanString(p.paidBy ?? p.paid_by),
  note:       p.note ?? p.notes ?? null,
  status: p.status ?? "active",
  trashed_at: p.trashedAt ?? p.trashed_at ?? null,
  deleted_at: p.deletedAt ?? p.deleted_at ?? null,
});

const fromPayment = (row) => {
  const method = row.method || row.payment_method || "";
  const receiptNo = row.receipt_no || row.receipt_number || "";
  const chequeNumber = row.cheque_number || row.check_number || "";
  const note = row.note || row.notes || "";
  return {
    id:        row.id,
    clientId:  row.client_id,
    amount:    Number(row.amount),
    date:      row.date,
    method,
    paymentMethod: method,
    payment_method: method,
    receiptNo,
    receipt_no: receiptNo,
    receiptNumber: receiptNo,
    receipt_number: receiptNo,
    receiptSequence: row.receipt_sequence ?? null,
    receipt_sequence: row.receipt_sequence ?? null,
    chequeNumber,
    cheque_number: chequeNumber,
    checkNumber: chequeNumber,
    check_number: chequeNumber,
    paidBy: row.paid_by || "",
    paid_by: row.paid_by || "",
    note,
    notes: note,
    status: row.status || "active",
    trashedAt: row.trashed_at || "",
    trashed_at: row.trashed_at || "",
    deletedAt: row.deleted_at || "",
    deleted_at: row.deleted_at || "",
  };
};

const fromInvoice = (row) => ({
  id: row.id,
  invoiceKey: row.invoice_key || "",
  invoiceNumber: row.invoice_display_number,
  invoiceDisplayNumber: row.invoice_display_number,
  year: String(row.invoice_year || ""),
  issueDate: row.issue_date || "",
  status: row.status || "issued",
  clientId: row.client_id || "",
  programId: row.program_id || "",
  recipientType: row.recipient_type || "client",
  recipientSnapshot: row.recipient_snapshot || {},
  programSnapshot: row.program_snapshot || {},
  amountSnapshot: row.amount_snapshot || {},
  paymentReferences: Array.isArray(row.payment_references) ? row.payment_references : [],
  createdAt: row.created_at || "",
  trashedAt: row.trashed_at || "",
  deletedAt: row.deleted_at || "",
});

const toBadgeTemplate = (template, agencyId) => ({
  id: template.id,
  agency_id: agencyId,
  name: cleanString(template.name) || "قالب الشارة",
  description: cleanString(template.description),
  template_path: cleanString(template.templatePath),
  width_mm: Number(template.widthMm || 90),
  height_mm: Number(template.heightMm || 140),
  layout: template.layout || {},
  is_default: Boolean(template.isDefault),
  updated_at: new Date().toISOString(),
});

const fromBadgeTemplate = (row) => ({
  id: row.id,
  name: row.name || "قالب الشارة",
  description: row.description || "",
  templatePath: row.template_path || "",
  widthMm: Number(row.width_mm || 90),
  heightMm: Number(row.height_mm || 140),
  layout: row.layout || {},
  isDefault: Boolean(row.is_default),
  createdAt: row.created_at || "",
  updatedAt: row.updated_at || "",
});

const toContractTemplate = (template, agencyId) => {
  const payload = {
    agency_id: agencyId,
    template_type: template.templateType || template.type,
    template_path: cleanString(template.templatePath),
    file_name: cleanString(template.fileName),
    file_size: Number(template.fileSize || 0) || null,
    updated_at: new Date().toISOString(),
  };
  if (template.id) payload.id = template.id;
  return payload;
};

const fromContractTemplate = (row) => ({
  id: row.id,
  templateType: row.template_type,
  type: row.template_type,
  templatePath: row.template_path || "",
  fileName: row.file_name || "",
  fileSize: Number(row.file_size || 0),
  createdAt: row.created_at || "",
  updatedAt: row.updated_at || "",
});

const toNotification = (n, agencyId) => {
  const normalizedTargetId = normalizeForeignKey(n.targetId ?? n.programId);
  const normalizedMeta = (n.meta && typeof n.meta === "object") ? n.meta : {};
  const derivedStateHash = buildNotificationStateHash({
    ...n,
    targetId: normalizedTargetId ?? n.programId ?? null,
    meta: normalizedMeta,
  });
  const inferredTargetType = n.targetType
    ?? (normalizedTargetId && n.targetType !== null
      ? (n.targetType ?? (n.programId ? "program" : null))
      : null);
  const inferredRoute = n.actionRoute
    ?? (inferredTargetType === "program" ? "programs"
      : inferredTargetType === "client" ? "clients"
        : null);
  return {
    id:          n.id,
    agency_id:   agencyId,
    type:        n.type        ?? null,
    title:       n.title       ?? null,
    message:     n.message     ?? null,
    program_id:  normalizeForeignKey(n.programId),
    target_type: inferredTargetType,
    target_id:   normalizedTargetId,
    action_route: inferredRoute,
    state_hash:  derivedStateHash,
    meta:        normalizedMeta,
    severity:    n.severity    ?? "info",
    is_read:     n.isRead      ?? false,
    is_archived: n.isArchived  ?? false,
  };
};

const fromNotification = (row) => ({
  id:          row.id,
  type:        row.type,
  title:       row.title,
  message:     row.message,
  programId:   row.program_id,
  targetType:  row.target_type,
  targetId:    row.target_id,
  actionRoute: row.action_route,
  stateHash:   row.state_hash,
  meta:        row.meta ?? {},
  severity:    row.severity || "info",
  isRead:      row.is_read ?? false,
  isArchived:  row.is_archived ?? false,
  createdAt:   row.created_at,
});

const fromUser = (row) => ({
  id:        row.id,
  agencyId:  row.agency_id,
  email:     row.email,
  fullName:  row.full_name,
  role:      row.role,
  status:    row.status,
  lastLogin: row.last_login,
  createdAt: row.created_at,
});

const toAgency = (a) => ({
  name_ar:        a.nameAr        ?? null,
  name_fr:        a.nameFr        ?? null,
  agency_city:    a.city          ?? null,
  address_tiznit: a.addressTiznit ?? null,
  address_agadir: a.addressAgadir ?? null,
  phone_tiznit1:  a.phoneTiznit1  ?? null,
  phone_tiznit2:  a.phoneTiznit2  ?? null,
  phone_agadir1:  a.phoneAgadir1  ?? null,
  phone_agadir2:  a.phoneAgadir2  ?? null,
  ice:            a.ice           ?? null,
  rc:             a.rc            ?? null,
  email:          a.email         ?? null,
  website:        a.website       ?? null,
  bank_name:           a.bankName          ?? null,
  bank_account_holder: a.bankAccountHolder ?? null,
  bank_rib:            a.bankRib           ?? null,
  bank_iban:           a.bankIban          ?? null,
  bank_note:           a.bankNote          ?? null,
  logo_path:           a.logoPath || a.logo_path || null,
});

const fromAgency = (row) => ({
  nameAr:        row.name_ar,
  nameFr:        row.name_fr,
  city:          row.agency_city || "",
  addressTiznit: row.address_tiznit,
  addressAgadir: row.address_agadir,
  phoneTiznit1:  row.phone_tiznit1,
  phoneTiznit2:  row.phone_tiznit2,
  phoneAgadir1:  row.phone_agadir1,
  phoneAgadir2:  row.phone_agadir2,
  ice:           row.ice,
  rc:            row.rc,
  email:         row.email,
  website:       row.website,
  bankName:          row.bank_name || "",
  bankAccountHolder: row.bank_account_holder || "",
  bankRib:           row.bank_rib || "",
  bankIban:          row.bank_iban || "",
  bankNote:          row.bank_note || "",
  logoPath:          row.logo_path || "",
  logoUrl:           row.logo_url || "",
});

const normalizeRoomingLocation = (location) => (
  location === "madinah" ? "madinah" : "makkah"
);

const toRoomingAssignment = (assignment, agencyId) => ({
  agency_id:      agencyId,
  program_id:     assignment.programId,
  location:       normalizeRoomingLocation(assignment.location),
  rooms:          Array.isArray(assignment.rooms) ? assignment.rooms : [],
  unassigned:     Array.isArray(assignment.unassigned) ? assignment.unassigned : [],
  meta:           assignment.meta && typeof assignment.meta === "object" ? assignment.meta : {},
  canvas_version: Number(assignment.version || assignment.canvasVersion || 4),
});

const fromRoomingAssignment = (row) => ({
  id:            row.id,
  agencyId:      row.agency_id,
  programId:     row.program_id,
  location:      row.location,
  rooms:         Array.isArray(row.rooms) ? row.rooms : [],
  unassigned:    Array.isArray(row.unassigned) ? row.unassigned : [],
  meta:          row.meta || {},
  version:       Number(row.canvas_version || 4),
  updatedAt:     row.updated_at,
  updatedBy:     row.updated_by,
});

// ─── DB operations ────────────────────────────────────────────────────────────

export const db = {

  dashboard: {
    async fetchSummary() {
      const { data, error } = await supabase.rpc("get_dashboard_summary");
      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };
      return { data: normalizeDashboardSummary(data), error: null };
    },

    async fetchStats(agencyId) {
      if (!agencyId) return { data: null, error: null };

      const [clientsResult, paymentsResult, programsResult] = await Promise.all([
        fetchPagedRows(() => supabase
          .from("clients")
          .select("id, program_id, official_price, sale_price")
          .eq("agency_id", agencyId)
          .or("deleted.is.null,deleted.eq.false")
          .or("archived.is.null,archived.eq.false")
          .order("id", { ascending: true })),
        fetchPagedRows(() => supabase
          .from("payments")
          .select("id, client_id, amount")
          .eq("agency_id", agencyId)
          .or("status.is.null,status.eq.active")
          .order("id", { ascending: true })),
        supabase
          .from("programs")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId)
          .or("deleted.is.null,deleted.eq.false"),
      ]);

      const error = clientsResult.error || paymentsResult.error || programsResult.error;
      if (error) return { data: null, error };

      const activeClients = clientsResult.data || [];
      const activeClientIds = new Set(activeClients.map((client) => client.id));
      const paidMap = new Map();

      (paymentsResult.data || []).forEach((payment) => {
        if (!activeClientIds.has(payment.client_id)) return;
        paidMap.set(
          payment.client_id,
          (paidMap.get(payment.client_id) || 0) + Number(payment.amount || 0)
        );
      });

      const programClientCounts = {};
      let cleared = 0;
      let partial = 0;
      let unpaid = 0;
      let totalRevenue = 0;
      let totalCollected = 0;
      let totalRemaining = 0;
      let totalDiscount = 0;

      activeClients.forEach((client) => {
        const paid = paidMap.get(client.id) || 0;
        const salePrice = Number(client.sale_price ?? 0);
        const officialPrice = Number(client.official_price ?? 0);

        if (client.program_id) {
          programClientCounts[client.program_id] = (programClientCounts[client.program_id] || 0) + 1;
        }

        if (paid === 0) unpaid += 1;
        else if (paid >= salePrice) cleared += 1;
        else partial += 1;

        totalRevenue += salePrice;
        totalCollected += paid;
        totalRemaining += Math.max(0, salePrice - paid);
        totalDiscount += Math.max(0, officialPrice - salePrice);
      });

      return {
        data: {
          totalClients: activeClients.length,
          archivedCount: 0,
          totalPrograms: programsResult.count ?? 0,
          cleared,
          partial,
          unpaid,
          totalRevenue,
          totalCollected,
          totalRemaining,
          totalDiscount,
          docsIncomplete: 0,
          programClientCounts,
        },
        error: null,
      };
    },
  },

  roomingAssignments: {
    async fetch(agencyId, programId, location) {
      if (!agencyId || !programId || !location) return { data: null, error: null };
      const { data, error } = await supabase
        .from("rooming_assignments")
        .select("id, agency_id, program_id, location, rooms, unassigned, meta, canvas_version, updated_at, updated_by")
        .eq("agency_id", agencyId)
        .eq("program_id", programId)
        .eq("location", normalizeRoomingLocation(location))
        .maybeSingle();
      return { data: data ? fromRoomingAssignment(data) : null, error };
    },
    async upsert(assignment, agencyId) {
      if (!agencyId || !assignment?.programId || !assignment?.location) return { data: null, error: null };
      const { data, error } = await supabase
        .from("rooming_assignments")
        .upsert(toRoomingAssignment(assignment, agencyId), { onConflict: "agency_id,program_id,location" })
        .select("id, agency_id, program_id, location, rooms, unassigned, meta, canvas_version, updated_at, updated_by")
        .single();
      return { data: data ? fromRoomingAssignment(data) : null, error };
    },
  },

  programs: {
    async fetchAll(agencyId) {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("agency_id", agencyId)
        .or("deleted.is.null,deleted.eq.false")
        .order("created_at", { ascending: true });
      return { data: data?.map(fromProgram) ?? null, error };
    },
    async fetchDeleted(agencyId) {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("deleted", true)
        .order("deleted_at", { ascending: false });
      return { data: data?.map(fromProgram) ?? null, error };
    },
    async upsert(program, agencyId) {
      const { error } = await supabase
        .from("programs").upsert(toProgram(program, agencyId), { onConflict: "id" });
      return { error };
    },
    async delete(id, agencyId) {
      const { error } = await supabase
        .from("programs").delete().eq("id", id).eq("agency_id", agencyId);
      return { error };
    },
    async markDeleted(id, agencyId, batchId) {
      const payload = {
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_batch_id: batchId ?? null,
      };
      const { error } = await supabase
        .from("programs")
        .update(payload)
        .eq("id", id)
        .eq("agency_id", agencyId);
      return { error };
    },
    async restore(id, agencyId) {
      const { error } = await supabase
        .from("programs")
        .update({ deleted: false, deleted_at: null, deleted_batch_id: null })
        .eq("id", id)
        .eq("agency_id", agencyId);
      return { error };
    },
    async deleteMany(ids, agencyId) {
      if (!ids || !ids.length) return { error: null };
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({ program_id: null })
        .in("program_id", ids)
        .eq("agency_id", agencyId);
      if (notificationError) return { error: notificationError };
      const { error } = await supabase
        .from("programs")
        .delete()
        .in("id", ids)
        .eq("agency_id", agencyId);
      return { error };
    },
  },

  clients: {
    async fetchAll(agencyId) {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agencyId)
        .or("deleted.is.null,deleted.eq.false")
        .order("registration_date", { ascending: true });
      return { data: data?.map(fromClient) ?? null, error };
    },
    async fetchPage(agencyId, {
      page = 1,
      pageSize = 10,
      archived = false,
      programId = null,
      search = "",
    } = {}) {
      if (!agencyId) return { data: [], count: 0, error: null };
      const safePage = Math.max(1, Number(page) || 1);
      const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;

      let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("agency_id", agencyId)
        .eq("deleted", false);

      if (archived) {
        query = query.eq("archived", true);
      } else {
        query = query.eq("archived", false);
      }

      if (programId === "__unassigned_program") {
        query = query.is("program_id", null);
      } else if (programId) {
        query = query.eq("program_id", programId);
      }

      const term = cleanPostgrestSearch(search);
      if (term) {
        const pattern = `%${term}%`;
        const filters = [
          `name.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `ticket_no.ilike.${pattern}`,
          `passport->>number.ilike.${pattern}`,
        ];
        if (UUID_SEARCH_REGEX.test(term)) filters.push(`id.eq.${term}`);
        query = query.or(filters.join(","));
      }

      const { data, error, count } = await query
        .order("registration_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .range(from, to);

      return {
        data: data?.map(fromClient) ?? [],
        count: count ?? 0,
        page: safePage,
        pageSize: safePageSize,
        error,
      };
    },
    async fetchDeleted(agencyId) {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("deleted", true)
        .order("deleted_at", { ascending: false });
      return { data: data?.map(fromClient) ?? null, error };
    },
    async upsert(client, agencyId) {
      const payload = toClient(client, agencyId);
      const { error } = await supabase
        .from("clients").upsert(payload, { onConflict: "id" });
      return { error };
    },
    async delete(id, agencyId) {
      const { error } = await supabase
        .from("clients").delete().eq("id", id).eq("agency_id", agencyId);
      return { error };
    },
    async markDeleted(ids, agencyId, batchId) {
      if (!ids || ids.length === 0) return { error: null };
      const payload = {
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_batch_id: batchId ?? null,
      };
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .in("id", ids)
        .eq("agency_id", agencyId);
      return { error };
    },
    async restore(ids, agencyId) {
      if (!ids || ids.length === 0) return { error: null };
      const { error } = await supabase
        .from("clients")
        .update({ deleted: false, deleted_at: null, deleted_batch_id: null })
        .in("id", ids)
        .eq("agency_id", agencyId);
      return { error };
    },
    async deleteMany(ids, agencyId) {
      if (!ids || !ids.length) return { error: null };
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", ids)
        .eq("agency_id", agencyId);
      return { error };
    },
  },

  payments: {
    async fetchAll(agencyId) {
      const { data, error } = await supabase
        .from("payments").select("*")
        .eq("agency_id", agencyId)
        .or("status.is.null,status.eq.active")
        .order("created_at", { ascending: true });
      return { data: data?.map(fromPayment) ?? null, error };
    },
    async fetchTrashed(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("payments").select("*")
        .eq("agency_id", agencyId)
        .eq("status", "trashed")
        .order("trashed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return { data: data?.map(fromPayment) ?? [], error };
    },
    async upsert(payment, agencyId) {
      const { error } = await supabase
        .from("payments").upsert(toPayment(payment, agencyId), { onConflict: "id" });
      return { error };
    },
    async createWithReceipt(payment, agencyId) {
      const { data, error } = await supabase.rpc("create_payment_with_receipt", {
        p_agency_id: agencyId,
        p_client_id: normalizeForeignKey(payment.clientId),
        p_amount: payment.amount,
        p_date: payment.date ?? null,
        p_method: payment.method ?? payment.paymentMethod ?? payment.payment_method ?? null,
        p_note: payment.note ?? payment.notes ?? null,
        p_cheque_number: cleanString(payment.chequeNumber ?? payment.cheque_number ?? payment.checkNumber ?? payment.check_number),
        p_paid_by: cleanString(payment.paidBy ?? payment.paid_by),
        p_payment_id: payment.id ?? null,
      });
      return { data: data ? fromPayment(data) : null, error };
    },
    async delete(id, agencyId) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase.rpc("trash_payment", {
        p_agency_id: agencyId,
        p_payment_id: id,
      });
      return { data: data ? fromPayment(data) : null, error };
    },
    async restore(id, agencyId) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase.rpc("restore_payment", {
        p_agency_id: agencyId,
        p_payment_id: id,
      });
      return { data: data ? fromPayment(data) : null, error };
    },
    async deleteTrashed(id, agencyId) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase.rpc("delete_trashed_payment", {
        p_agency_id: agencyId,
        p_payment_id: id,
      });
      return { data: data ? fromPayment(data) : null, error };
    },
  },

  invoices: {
    async fetch(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("agency_id", agencyId)
        .neq("status", "deleted")
        .order("issue_date", { ascending: false })
        .order("invoice_number", { ascending: false });
      return {
        data: data?.map(fromInvoice) ?? [],
        error,
      };
    },
    async fetchTrashed(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("agency_id", agencyId)
        .eq("status", "trashed")
        .order("trashed_at", { ascending: false, nullsFirst: false })
        .order("issue_date", { ascending: false });
      return {
        data: data?.map(fromInvoice) ?? [],
        error,
      };
    },
    async issueFinal(agencyId, draft = {}) {
      if (!agencyId) return { data: null, error: null };
      const { data, error } = await supabase.rpc("issue_final_invoice", {
        p_agency_id: agencyId,
        p_invoice_key: draft.invoiceKey || null,
        p_client_id: draft.clientId || null,
        p_program_id: draft.programId || null,
        p_issue_date: draft.issueDate || null,
        p_recipient_type: draft.recipientType || "client",
        p_recipient_snapshot: draft.recipientSnapshot || {},
        p_program_snapshot: draft.programSnapshot || {},
        p_amount_snapshot: draft.amountSnapshot || {},
        p_payment_references: draft.paymentReferences || [],
      });
      return {
        data: data ? fromInvoice(data) : null,
        error,
      };
    },
    async trash(agencyId, id) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "trashed", trashed_at: new Date().toISOString() })
        .eq("agency_id", agencyId)
        .eq("id", id)
        .select("*")
        .single();
      return { data: data ? fromInvoice(data) : null, error };
    },
    async restore(agencyId, id) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "issued", trashed_at: null, deleted_at: null })
        .eq("agency_id", agencyId)
        .eq("id", id)
        .select("*")
        .single();
      return { data: data ? fromInvoice(data) : null, error };
    },
    async markDeleted(agencyId, id) {
      if (!agencyId || !id) return { data: null, error: null };
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("agency_id", agencyId)
        .eq("id", id)
        .select("*")
        .single();
      return { data: data ? fromInvoice(data) : null, error };
    },
  },

  badgeTemplates: {
    async fetchAll(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("badge_templates")
        .select("*")
        .eq("agency_id", agencyId)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });
      return { data: data?.map(fromBadgeTemplate) ?? [], error };
    },
    async upsert(template, agencyId) {
      if (!agencyId) return { data: null, error: null };
      const payload = toBadgeTemplate(template, agencyId);
      if (payload.is_default) {
        await supabase
          .from("badge_templates")
          .update({ is_default: false })
          .eq("agency_id", agencyId);
      }
      const { data, error } = await supabase
        .from("badge_templates")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();
      return { data: data ? fromBadgeTemplate(data) : null, error };
    },
    async setDefault(id, agencyId) {
      if (!agencyId || !id) return { data: null, error: null };
      const { error: resetError } = await supabase
        .from("badge_templates")
        .update({ is_default: false })
        .eq("agency_id", agencyId);
      if (resetError) return { data: null, error: resetError };
      const { data, error } = await supabase
        .from("badge_templates")
        .update({ is_default: true })
        .eq("agency_id", agencyId)
        .eq("id", id)
        .select("*")
        .single();
      return { data: data ? fromBadgeTemplate(data) : null, error };
    },
    async delete(id, agencyId) {
      if (!agencyId || !id) return { error: null };
      const { error } = await supabase
        .from("badge_templates")
        .delete()
        .eq("agency_id", agencyId)
        .eq("id", id);
      return { error };
    },
  },

  contractTemplates: {
    async fetchAll(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("agency_id", agencyId)
        .order("template_type", { ascending: true });
      return { data: data?.map(fromContractTemplate) ?? [], error };
    },
    async upsert(template, agencyId) {
      if (!agencyId) return { data: null, error: null };
      const payload = toContractTemplate(template, agencyId);
      const { data, error } = await supabase
        .from("contract_templates")
        .upsert(payload, { onConflict: "agency_id,template_type" })
        .select("*")
        .single();
      return { data: data ? fromContractTemplate(data) : null, error };
    },
    async deleteByType(templateType, agencyId) {
      if (!agencyId || !templateType) return { error: null };
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("agency_id", agencyId)
        .eq("template_type", templateType);
      return { error };
    },
  },

  notifications: {
    mapRow: fromNotification,
    async fetchAll(agencyId) {
      const { data, error } = await supabase
        .from("notifications").select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });
      return { data: data?.map(fromNotification) ?? null, error };
    },
    async upsert(notification, agencyId) {
      const payload = toNotification(notification, agencyId);
      const createdAt = notification.createdAt || new Date().toISOString();
      payload.created_at = createdAt;

      let query = supabase
        .from("notifications")
        .select("id,is_archived")
        .eq("agency_id", agencyId)
        .eq("state_hash", payload.state_hash)
        .limit(1);

      if (payload.type) query = query.eq("type", payload.type);
      else query = query.is("type", null);

      if (payload.target_id) query = query.eq("target_id", payload.target_id);
      else query = query.is("target_id", null);

      const { data: existing, error: lookupError } = await query.maybeSingle();
      if (lookupError && lookupError.code !== "PGRST116") {
        return { error: lookupError };
      }

      if (existing) {
        if (existing.is_archived) {
          return { error: null, deduped: true };
        }
        const { error: updateError } = await supabase
          .from("notifications")
          .update({
            title: payload.title,
            message: payload.message,
            severity: payload.severity,
            meta: payload.meta,
            action_route: payload.action_route,
            target_type: payload.target_type,
            program_id: payload.program_id,
            is_read: false,
            is_archived: false,
            created_at: createdAt,
          })
          .eq("id", existing.id)
          .eq("agency_id", agencyId);
        return { error: updateError };
      }

      const { error } = await supabase
        .from("notifications")
        .insert(payload);
      return { error };
    },
    async markRead(id, isRead = true, agencyId = null) {
      let query = supabase
        .from("notifications")
        .update({ is_read: isRead })
        .eq("id", id);
      if (agencyId) query = query.eq("agency_id", agencyId);
      const { error } = await query;
      return { error };
    },
    async markManyRead(ids, agencyId = null) {
      if (!ids || ids.length === 0) return { error: null };
      let query = supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids);
      if (agencyId) query = query.eq("agency_id", agencyId);
      const { error } = await query;
      return { error };
    },
    async markArchived(id, archived = true, agencyId = null) {
      let query = supabase
        .from("notifications")
        .update({ is_archived: archived })
        .eq("id", id);
      if (agencyId) query = query.eq("agency_id", agencyId);
      const { error } = await query;
      return { error };
    },
    async delete(id, agencyId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("agency_id", agencyId);
      return { error };
    },
    async deleteMany(ids, agencyId) {
      if (!ids || ids.length === 0) return { error: null };
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", ids)
        .eq("agency_id", agencyId);
      return { error };
    },
    async deleteAllArchived(agencyId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("agency_id", agencyId)
        .eq("is_archived", true);
      return { error };
    },
  },

  agency: {
    async fetch(agencyId) {
      const { data, error } = await supabase
        .from("agencies").select("*").eq("id", agencyId).single();
      return { data: data ? fromAgency(data) : null, error };
    },
    async update(agencyId, agencyData) {
      const { error } = await supabase
        .from("agencies").update(toAgency(agencyData)).eq("id", agencyId);
      return { error };
    },
  },

  activityLog: {
    mapRow(row) {
      if (!row) return null;
      return {
        id:          row.id,
        type:        row.type,
        description: row.description,
        clientName:  row.client_name,
        time:        row.created_at,
        isArchived:  !!row.is_archived,
      };
    },
    async fetchRecent(agencyId, limit = 5) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("activity_log")
        .select("id,type,description,client_name,created_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return {
        data: data?.map((r) => db.activityLog.mapRow(r)) ?? [],
        error,
      };
    },
    async fetchPage(agencyId, {
      limit = 20,
      offset = 0,
      types = null,
      category = "all",
      search = "",
      from = null,
    } = {}) {
      if (!agencyId) return { data: [], count: 0, error: null };
      let query = supabase
        .from("activity_log_all")
        .select("id,type,description,client_name,created_at,is_archived", { count: "exact" })
        .eq("agency_id", agencyId);
      if (types && types.length) {
        query = query.in("type", types);
      }
      if (category && category !== "all") {
        const categoryFilters = {
          clients: "type.ilike.client_%,description.ilike.%معتمر%,description.ilike.%client%,description.ilike.%pilgrim%,description.ilike.%pèlerin%",
          programs: "type.ilike.program_%,description.ilike.%برنامج%,description.ilike.%program%,description.ilike.%programme%",
          payments: "type.ilike.payment_%,description.ilike.%دفعة%,description.ilike.%دفع%,description.ilike.%وصل%,description.ilike.%payment%,description.ilike.%paiement%,description.ilike.%receipt%,description.ilike.%reçu%",
          imports: "type.ilike.import_%,type.ilike.%import%,type.ilike.%backup%,description.ilike.%استيراد%,description.ilike.%استورد%,description.ilike.%import%,description.ilike.%backup%,description.ilike.%sauvegarde%,description.ilike.%ملف%,description.ilike.%excel%",
        };
        if (categoryFilters[category]) query = query.or(categoryFilters[category]);
      }
      if (from) {
        query = query.gte("created_at", from);
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`type.ilike.${term},description.ilike.${term},client_name.ilike.${term}`);
      }
      const start = offset;
      const end   = offset + limit - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, end);
      return {
        data: data?.map((r) => db.activityLog.mapRow(r)) ?? [],
        count: count ?? 0,
        error,
      };
    },
    async insert(agencyId, userId, entry) {
      if (!agencyId) return { error: null };
      const { error } = await supabase
        .from("activity_log")
        .insert({
          agency_id:   agencyId,
          user_id:     userId ?? null,
          type:        entry.type,
          description: entry.description,
          client_name: entry.clientName || null,
          created_at:  entry.time || new Date().toISOString(),
        });
      return { error };
    },
    async clear(agencyId, days = 0) {
      if (!agencyId) return { data: null, error: null };
      const { data, error, status } = await supabase
        .rpc("clear_activity_log", { days_threshold: days });
      if (status === 404 || isMissingRpcError(error, "clear_activity_log")) {
        return {
          data,
          error: {
            ...error,
            isMissingMigration: true,
            missingRpc: "clear_activity_log",
          },
        };
      }
      return { data, error };
    },
  },

  users: {
    async fetchProfile(userId) {
      const { data, error } = await supabase
        .from("users").select("id, agency_id, role, full_name, status")
        .eq("id", userId).single();
      return { data, error };
    },
    async fetchByAgency(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("users")
        .select("id, agency_id, email, full_name, role, status, last_login, created_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });
      return { data: (data || []).map(fromUser), error };
    },
  },

  // Realtime subscriptions
  subscribeAll({
    agencyId = null,
    onProgram = () => {},
    onClient = () => {},
    onPayment = () => {},
    onNotification = () => {},
  }) {
    const agencyScopedChanges = (table) => ({
      event: "*",
      schema: "public",
      table,
      ...(agencyId ? { filter: `agency_id=eq.${agencyId}` } : {}),
    });

    return supabase
      .channel("db-changes")
      .on("postgres_changes", agencyScopedChanges("programs"), onProgram)
      .on("postgres_changes", agencyScopedChanges("clients"), onClient)
      .on("postgres_changes", agencyScopedChanges("payments"), onPayment)
      .on("postgres_changes", agencyScopedChanges("notifications"), onNotification)
      .subscribe();
  },
};
