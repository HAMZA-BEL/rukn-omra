/**
 * db.js — All Supabase CRUD operations with camelCase ↔ snake_case mapping.
 * Every operation explicitly scopes data to the provided agencyId (defense-in-depth
 * on top of Supabase RLS policies).
 */
import { supabase } from "./supabase";
import { isPreviousPaymentRecord, normalizePaymentRecord } from "../utils/paymentRecords";
import { buildNotificationStateHash } from "../utils/notifications";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientIdentityName } from "../utils/clientNames";
import { getClientServiceType } from "../utils/clientServiceTypes";
import { normalizeHotelCheckinDay, normalizeVisitOrder } from "../utils/hotelDates";
import { normalizeRouteStops } from "../utils/programRoutes";

const normalizeForeignKey = (value) => (
  typeof value === "string" && value.trim() ? value : null
);

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);

const hasClientTravelGroupAssignment = (client = {}) => (
  hasOwn(client, "travelGroupId") || hasOwn(client, "travel_group_id")
);

const getClientTravelGroupAssignment = (client = {}) => (
  normalizeForeignKey(
    hasOwn(client, "travelGroupId")
      ? client.travelGroupId
      : client.travel_group_id
  )
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

const chunkArray = (items = [], size = 500) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toNullableFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toDecimalNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/\s+/g, "").replace(/٫/g, ".").replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeJsonValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item !== undefined) acc[key] = sanitizeJsonValue(item);
    return acc;
  }, {});
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

const fromTrashPageItem = (row = {}) => ({
  itemType: row.item_type || row.itemType || "",
  itemId: row.item_id || row.itemId || "",
  clientId: row.client_id || row.clientId || "",
  clientKind: row.client_kind || row.clientKind || "",
  title: row.title || "",
  clientName: row.client_name || row.clientName || "",
  phone: row.phone || "",
  city: row.city || "",
  amount: toNullableFiniteNumber(row.amount),
  method: row.method || "",
  receiptNo: row.receipt_no || row.receiptNo || "",
  invoiceDisplayNumber: row.invoice_display_number || row.invoiceDisplayNumber || "",
  programName: row.program_name || row.programName || "",
  departure: row.departure || "",
  duration: row.duration || "",
  deletedAt: row.deleted_at || row.deletedAt || "",
  createdAt: row.created_at || row.createdAt || "",
  deletedBatchId: row.deleted_batch_id || row.deletedBatchId || "",
  linkedCount: toFiniteNumber(row.linked_count ?? row.linkedCount),
  status: row.status || "",
});

const normalizeTrashPage = (payload = {}, { page = 1, pageSize = 25, filter = "all" } = {}) => {
  const source = parseRpcJson(payload) || {};
  const items = Array.isArray(source.items) ? source.items.map(fromTrashPageItem) : [];
  return {
    items,
    totalCount: toFiniteNumber(source.total_count ?? source.totalCount),
    page,
    pageSize,
    filter: source.item_type || filter,
  };
};

const fromProgramPageSummaryItem = (row = {}) => {
  const programId = row.program_id || row.programId || row.id || "";
  const capacity = toFiniteNumber(row.capacity ?? row.seats);
  const capacityStatus = row.capacity_status || row.capacityStatus || "unknown";
  const paymentStatus = row.payment_status || row.paymentStatus || "empty";
  const typeKind = row.type_kind || row.typeKind || "";
  const summary = {
    programId,
    registeredCount: toFiniteNumber(row.registered_count ?? row.registeredCount),
    clearedCount: toFiniteNumber(row.cleared_count ?? row.clearedCount),
    unpaidCount: toFiniteNumber(row.unpaid_count ?? row.unpaidCount),
    partialCount: toFiniteNumber(row.partial_count ?? row.partialCount),
    totalPaid: toFiniteNumber(row.total_paid ?? row.totalPaid),
    remainingTotal: toFiniteNumber(row.remaining_total ?? row.remainingTotal),
    packageCount: toFiniteNumber(row.package_count ?? row.packageCount, 1),
    startingPrice: toFiniteNumber(row.starting_price ?? row.startingPrice),
    primaryHotelMecca: row.primary_hotel_mecca ?? row.primaryHotelMecca ?? "",
    primaryHotelMadina: row.primary_hotel_madina ?? row.primaryHotelMadina ?? "",
    hasMultiplePackages: Boolean(row.has_multiple_packages ?? row.hasMultiplePackages),
    capacity,
    hasValidCapacity: Boolean(row.has_valid_capacity ?? row.hasValidCapacity),
    capacityPct: toFiniteNumber(row.capacity_pct ?? row.capacityPct),
    isFull: capacityStatus === "full",
    isNotFull: capacityStatus === "not_full",
    capacityStatus,
    isCleared: paymentStatus === "cleared",
    isNotCleared: paymentStatus === "not_cleared",
    paymentStatus,
    typeKind,
    year: toNullableFiniteNumber(row.year),
  };

  return {
    id: programId,
    name: row.name || "",
    nameFr: row.name_fr || row.nameFr || "",
    type: row.type || "",
    duration: row.duration || "",
    departure: row.departure || "",
    returnDate: row.return_date || row.returnDate || "",
    seats: toFiniteNumber(row.seats ?? row.capacity),
    hotelMecca: row.hotel_mecca || row.hotelMecca || "",
    hotelMadina: row.hotel_madina || row.hotelMadina || "",
    ...(("outbound_route_text" in row) || ("outboundRouteText" in row)
      ? { outboundRouteText: row.outbound_route_text || row.outboundRouteText || "" }
      : {}),
    ...(("outbound_route_stops" in row) || ("outboundRouteStops" in row)
      ? { outboundRouteStops: normalizeRouteStops(row.outbound_route_stops ?? row.outboundRouteStops) }
      : {}),
    ...(("return_route_text" in row) || ("returnRouteText" in row)
      ? { returnRouteText: row.return_route_text || row.returnRouteText || "" }
      : {}),
    ...(("return_route_stops" in row) || ("returnRouteStops" in row)
      ? { returnRouteStops: normalizeRouteStops(row.return_route_stops ?? row.returnRouteStops) }
      : {}),
    ...(("poster_travel_route" in row) || ("posterTravelRoute" in row)
      ? { posterTravelRoute: row.poster_travel_route || row.posterTravelRoute || "" }
      : {}),
    deleted: false,
    deletedAt: null,
    status: row.status || "active",
    nusukUploadEnabled: Boolean(row.nusuk_upload_enabled ?? row.nusukUploadEnabled),
    nusuk_upload_enabled: Boolean(row.nusuk_upload_enabled ?? row.nusukUploadEnabled),
    programSummary: summary,
  };
};

const normalizeProgramsPageSummary = (payload = {}, {
  search = "",
  year = null,
  type = "all",
  status = "all",
  limit = 12,
  offset = 0,
} = {}) => {
  const source = parseRpcJson(payload) || {};
  const items = Array.isArray(source.items) ? source.items.map(fromProgramPageSummaryItem) : [];
  return {
    items,
    totalCount: toFiniteNumber(source.total_count ?? source.totalCount),
    limit: toFiniteNumber(source.limit, limit),
    offset: toFiniteNumber(source.offset, offset),
    search: source.search ?? search,
    year: toNullableFiniteNumber(source.year ?? year),
    type: source.type || type,
    status: source.status || status,
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

const PROGRAM_SELECT_COLUMNS = [
  "id",
  "name",
  "name_fr",
  "type",
  "duration",
  "departure",
  "return_date",
  "hotel_checkin_day",
  "transport",
  "meal_plan",
  "seats",
  "hotel_mecca",
  "hotel_madina",
  "outbound_route_stops",
  "return_route_stops",
  "outbound_route_text",
  "return_route_text",
  "poster_travel_route",
  "badge_guide_phone",
  "badge_saudi_phone_1",
  "badge_saudi_phone_2",
  "badge_note",
  "badge_template_id",
  "price_table",
  "notes",
  "deleted",
  "deleted_at",
  "deleted_batch_id",
  "status",
  "nusuk_upload_enabled",
  "created_at",
].join(", ");

const PROGRAM_TRAVEL_GROUP_SELECT_COLUMNS = [
  "id",
  "agency_id",
  "program_id",
  "name",
  "code",
  "airline",
  "departure_city",
  "arrival_city",
  "return_departure_city",
  "return_arrival_city",
  "departure_date",
  "return_date",
  "visit_order",
  "hotel_check_in",
  "route",
  "flight_numbers",
  "seat_capacity",
  "notes",
  "is_default",
  "sort_order",
  "created_at",
  "updated_at",
].join(", ");

const CLIENT_SELECT_COLUMNS = [
  "id",
  "program_id",
  "travel_group_id",
  "name",
  "first_name",
  "last_name",
  "nom",
  "prenom",
  "phone",
  "address",
  "registration_source",
  "city",
  "hotel_level",
  "hotel_mecca",
  "hotel_madina",
  "room_type",
  "official_price",
  "sale_price",
  "ticket_no",
  "represented_by_client_id",
  "represented_by_relationship",
  "passport",
  "docs",
  "notes",
  "registration_date",
  "last_modified",
  "archived",
  "archived_at",
  "deleted",
  "deleted_at",
  "deleted_batch_id",
  "created_at",
].join(", ");

const PAYMENT_SELECT_COLUMNS = [
  "id",
  "client_id",
  "amount",
  "date",
  "method",
  "receipt_no",
  "receipt_sequence",
  "cheque_number",
  "paid_by",
  "note",
  "payment_type",
  "legacy_receipt_number",
  "group_payment_id",
  "status",
  "trashed_at",
  "deleted_at",
  "created_at",
].join(", ");

const PAYMENT_GROUP_SELECT_COLUMNS = [
  "id",
  "agency_id",
  "program_id",
  "payer_client_id",
  "payer_name",
  "receipt_number",
  "payment_type",
  "payment_method",
  "cheque_number",
  "paid_by",
  "payment_date",
  "total_amount",
  "notes",
  "covered_clients",
  "created_by",
  "created_at",
  "updated_at",
  "deleted_at",
].join(", ");

const INVOICE_SELECT_COLUMNS = [
  "id",
  "invoice_key",
  "invoice_number",
  "invoice_display_number",
  "invoice_year",
  "issue_date",
  "status",
  "client_id",
  "program_id",
  "recipient_type",
  "recipient_snapshot",
  "program_snapshot",
  "amount_snapshot",
  "payment_references",
  "created_at",
  "trashed_at",
  "deleted_at",
].join(", ");

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
  hotel_checkin_day: normalizeHotelCheckinDay(p.hotelCheckinDay ?? p.hotel_checkin_day),
  transport:    p.transport    ?? null,
  meal_plan:    p.mealPlan     ?? null,
  seats:        p.seats        ?? 40,
  hotel_mecca:  p.hotelMecca   ?? null,
  hotel_madina: p.hotelMadina  ?? null,
  ...(("outboundRouteStops" in p) || ("outbound_route_stops" in p)
    ? { outbound_route_stops: normalizeRouteStops(p.outboundRouteStops ?? p.outbound_route_stops) }
    : {}),
  ...(("returnRouteStops" in p) || ("return_route_stops" in p)
    ? { return_route_stops: normalizeRouteStops(p.returnRouteStops ?? p.return_route_stops) }
    : {}),
  ...(("outboundRouteText" in p) || ("outbound_route_text" in p)
    ? { outbound_route_text: p.outboundRouteText ?? p.outbound_route_text ?? null }
    : {}),
  ...(("returnRouteText" in p) || ("return_route_text" in p)
    ? { return_route_text: p.returnRouteText ?? p.return_route_text ?? null }
    : {}),
  ...(("posterTravelRoute" in p) || ("poster_travel_route" in p)
    ? { poster_travel_route: p.posterTravelRoute ?? p.poster_travel_route ?? null }
    : {}),
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
  nusuk_upload_enabled: Boolean(p.nusukUploadEnabled ?? p.nusuk_upload_enabled ?? false),
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
  hotelCheckinDay: normalizeHotelCheckinDay(row.hotel_checkin_day),
  transport:   row.transport,
  mealPlan:    row.meal_plan,
  seats:       row.seats,
  hotelMecca:  row.hotel_mecca,
  hotelMadina: row.hotel_madina,
  outboundRouteStops: normalizeRouteStops(row.outbound_route_stops),
  returnRouteStops: normalizeRouteStops(row.return_route_stops),
  outboundRouteText: row.outbound_route_text || "",
  returnRouteText: row.return_route_text || "",
  posterTravelRoute: row.poster_travel_route || "",
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
  nusukUploadEnabled: Boolean(row.nusuk_upload_enabled),
  nusuk_upload_enabled: Boolean(row.nusuk_upload_enabled),
});

const toNullableVisitOrder = (value) => {
  const text = cleanString(value);
  return text ? normalizeVisitOrder(text) : null;
};

const toNullableHotelCheckIn = (value) => {
  const text = cleanString(value);
  return text ? normalizeHotelCheckinDay(text) : null;
};

const toProgramTravelGroup = (group = {}, agencyId) => ({
  id:                  group.id,
  agency_id:           agencyId,
  program_id:          normalizeForeignKey(group.programId ?? group.program_id),
  name:                cleanString(group.name) || "",
  code:                cleanString(group.code),
  airline:             cleanString(group.airline),
  departure_city:      cleanString(group.departureCity ?? group.departure_city),
  arrival_city:        cleanString(group.arrivalCity ?? group.arrival_city),
  return_departure_city: cleanString(group.returnDepartureCity ?? group.return_departure_city),
  return_arrival_city: cleanString(group.returnArrivalCity ?? group.return_arrival_city),
  departure_date:      cleanString(group.departureDate ?? group.departure_date),
  return_date:         cleanString(group.returnDate ?? group.return_date),
  visit_order:         toNullableVisitOrder(group.visitOrder ?? group.visit_order),
  hotel_check_in:      toNullableHotelCheckIn(group.hotelCheckIn ?? group.hotel_check_in ?? group.hotelCheckinDay ?? group.hotel_checkin_day),
  route:               cleanString(group.route),
  flight_numbers:      cleanString(group.flightNumbers ?? group.flight_numbers),
  seat_capacity:       toNullableFiniteNumber(group.seatCapacity ?? group.seat_capacity),
  notes:               cleanString(group.notes),
  is_default:          Boolean(group.isDefault ?? group.is_default),
  sort_order:          toFiniteNumber(group.sortOrder ?? group.sort_order),
  updated_at:          new Date().toISOString(),
});

const fromProgramTravelGroup = (row = {}) => ({
  id: row.id,
  agencyId: row.agency_id,
  agency_id: row.agency_id,
  programId: row.program_id,
  program_id: row.program_id,
  name: row.name || "",
  code: row.code || "",
  airline: row.airline || "",
  departureCity: row.departure_city || "",
  departure_city: row.departure_city || "",
  arrivalCity: row.arrival_city || "",
  arrival_city: row.arrival_city || "",
  returnDepartureCity: row.return_departure_city || "",
  return_departure_city: row.return_departure_city || "",
  returnArrivalCity: row.return_arrival_city || "",
  return_arrival_city: row.return_arrival_city || "",
  departureDate: row.departure_date || "",
  departure_date: row.departure_date || "",
  returnDate: row.return_date || "",
  return_date: row.return_date || "",
  visitOrder: row.visit_order ? normalizeVisitOrder(row.visit_order) : "",
  visit_order: row.visit_order ? normalizeVisitOrder(row.visit_order) : "",
  hotelCheckIn: row.hotel_check_in ? normalizeHotelCheckinDay(row.hotel_check_in) : "",
  hotel_check_in: row.hotel_check_in ? normalizeHotelCheckinDay(row.hotel_check_in) : "",
  route: row.route || "",
  flightNumbers: row.flight_numbers || "",
  flight_numbers: row.flight_numbers || "",
  seatCapacity: toNullableFiniteNumber(row.seat_capacity),
  seat_capacity: toNullableFiniteNumber(row.seat_capacity),
  notes: row.notes || "",
  isDefault: Boolean(row.is_default),
  is_default: Boolean(row.is_default),
  sortOrder: toFiniteNumber(row.sort_order),
  sort_order: toFiniteNumber(row.sort_order),
  createdAt: row.created_at || "",
  created_at: row.created_at || "",
  updatedAt: row.updated_at || "",
  updated_at: row.updated_at || "",
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
  ...(hasClientTravelGroupAssignment(c)
    ? { travel_group_id: getClientTravelGroupAssignment(c) }
    : {}),
  name:              cleanString(getClientIdentityName(c)),
  first_name:        cleanString(c.firstName),
  last_name:         cleanString(c.lastName),
  nom:               cleanString(c.nom),
  prenom:            cleanString(c.prenom),
  phone:             cleanString(c.phone),
  address:           cleanString(c.address ?? c.adress ?? c.addressLine ?? c.homeAddress),
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
  travelGroupId:    row.travel_group_id ?? null,
  name:             composeClientName(row),
  firstName:        row.first_name,
  lastName:         row.last_name,
  nom:              row.nom,
  prenom:           row.prenom,
  phone:            row.phone,
  address:          row.address,
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
  createdAt:        row.created_at || row.createdAt || "",
  created_at:       row.created_at || row.createdAt || "",
  archived:         row.archived   ?? false,
  archivedAt:       row.archived_at ?? null,
  deleted:          row.deleted ?? false,
  deletedAt:        row.deleted_at,
  deletedBatchId:   row.deleted_batch_id,
  };
};

const toPayment = (p, agencyId) => {
  const normalized = normalizePaymentRecord(p);
  return {
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
    note:       cleanString(p.note ?? p.notes),
    payment_type: normalized.paymentType,
    legacy_receipt_number: cleanString(normalized.legacyReceiptNumber),
    group_payment_id: normalizeForeignKey(p.groupPaymentId ?? p.group_payment_id),
    status: p.status ?? "active",
    trashed_at: p.trashedAt ?? p.trashed_at ?? null,
    deleted_at: p.deletedAt ?? p.deleted_at ?? null,
  };
};

const fromPayment = (row) => {
  const method = row.method || row.payment_method || "";
  const receiptNo = row.receipt_no || row.receipt_number || "";
  const chequeNumber = row.cheque_number || row.check_number || "";
  const normalized = normalizePaymentRecord(row);
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
    paymentType: normalized.paymentType,
    payment_type: normalized.paymentType,
    isPreviousPayment: normalized.isPreviousPayment,
    is_previous_payment: normalized.isPreviousPayment,
    legacyReceiptNumber: normalized.legacyReceiptNumber,
    legacy_receipt_number: normalized.legacyReceiptNumber,
    groupPaymentId: row.group_payment_id || "",
    group_payment_id: row.group_payment_id || "",
    note: normalized.note,
    notes: normalized.note,
    status: row.status || "active",
    trashedAt: row.trashed_at || "",
    trashed_at: row.trashed_at || "",
    deletedAt: row.deleted_at || "",
    deleted_at: row.deleted_at || "",
  };
};

const fromPaymentGroup = (row = {}) => ({
  id: row.id,
  agencyId: row.agency_id,
  agency_id: row.agency_id,
  programId: row.program_id,
  program_id: row.program_id,
  payerClientId: row.payer_client_id || "",
  payer_client_id: row.payer_client_id || "",
  payerName: row.payer_name || "",
  payer_name: row.payer_name || "",
  receiptNumber: row.receipt_number || "",
  receipt_number: row.receipt_number || "",
  paymentType: row.payment_type || "normal",
  payment_type: row.payment_type || "normal",
  paymentMethod: row.payment_method || "",
  payment_method: row.payment_method || "",
  chequeNumber: row.cheque_number || "",
  cheque_number: row.cheque_number || "",
  paidBy: row.paid_by || "",
  paid_by: row.paid_by || "",
  paymentDate: row.payment_date || "",
  payment_date: row.payment_date || "",
  totalAmount: Number(row.total_amount || 0),
  total_amount: Number(row.total_amount || 0),
  notes: row.notes || "",
  note: row.notes || "",
  coveredClients: Array.isArray(row.covered_clients) ? row.covered_clients : [],
  covered_clients: Array.isArray(row.covered_clients) ? row.covered_clients : [],
  createdBy: row.created_by || "",
  created_by: row.created_by || "",
  createdAt: row.created_at || "",
  created_at: row.created_at || "",
  updatedAt: row.updated_at || "",
  updated_at: row.updated_at || "",
  deletedAt: row.deleted_at || "",
  deleted_at: row.deleted_at || "",
});

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

const fromDeletedClientRelatedCounts = (row = {}) => ({
  clientId: row.client_id || "",
  paymentsCount: toFiniteNumber(row.payments_count),
  activePaymentsCount: toFiniteNumber(row.active_payments_count),
  inactivePaymentsCount: toFiniteNumber(row.inactive_payments_count),
  invoicesCount: toFiniteNumber(row.invoices_count),
  activeInvoicesCount: toFiniteNumber(row.active_invoices_count),
  inactiveInvoicesCount: toFiniteNumber(row.inactive_invoices_count),
  finalInvoicesCount: toFiniteNumber(row.final_invoices_count),
  notificationsCount: toFiniteNumber(row.notifications_count),
  representationLinksCount: toFiniteNumber(row.representation_links_count),
  roomingReferencesCount: toFiniteNumber(row.rooming_references_count),
  hasBadgePhoto: Boolean(row.has_badge_photo),
  canPermanentDelete: row.can_permanent_delete !== false,
  blockReason: row.block_reason || "",
  reasonKey: row.reason_key || "",
});

const isInactiveLinkedPaymentRecord = (payment = {}) => {
  const status = cleanString(payment.status).toLowerCase();
  if (["trashed", "deleted", "inactive", "archived", "void", "cancelled", "canceled"].includes(status)) return true;
  if (payment.trashed_at || payment.trashedAt || payment.deleted_at || payment.deletedAt) return true;
  if (payment.deleted === true || payment.trashed === true || payment.archived === true) return true;
  return false;
};

const isActiveLinkedInvoiceRecord = (invoice = {}) => {
  const status = cleanString(invoice.status || "issued").toLowerCase();
  return !["trashed", "deleted", "void", "cancelled", "canceled"].includes(status)
    && !invoice.trashed_at
    && !invoice.trashedAt
    && !invoice.deleted_at
    && !invoice.deletedAt;
};

const toBadgeTemplate = (template, agencyId) => {
  const widthMm = toDecimalNumber(template.widthMm, 90);
  const heightMm = toDecimalNumber(template.heightMm, 140);
  const templatePath = template.templatePath
    || template.template_path
    || template.backgroundImagePath
    || template.background_image_path
    || "";

  return {
    id: template.id,
    agency_id: agencyId,
    name: cleanString(template.name) || "قالب الشارة",
    description: cleanString(template.description),
    template_path: cleanString(templatePath),
    thumbnail_path: cleanString(template.thumbnailPath || template.thumbnail_path),
    width_mm: widthMm > 0 ? widthMm : 90,
    height_mm: heightMm > 0 ? heightMm : 140,
    layout: sanitizeJsonValue(template.layout || {}),
    is_default: Boolean(template.isDefault),
    updated_at: new Date().toISOString(),
  };
};

const fromBadgeTemplate = (row) => ({
  id: row.id,
  name: row.name || "قالب الشارة",
  description: row.description || "",
  templatePath: row.template_path || row.background_image_path || "",
  thumbnailPath: row.thumbnail_path || "",
  backgroundImagePath: row.background_image_path || row.template_path || "",
  backgroundImageUrl: row.background_image_url || "",
  widthMm: toDecimalNumber(row.width_mm, 90) || 90,
  heightMm: toDecimalNumber(row.height_mm, 140) || 140,
  layout: row.layout || {},
  isDefault: Boolean(row.is_default),
  createdAt: row.created_at || "",
  updatedAt: row.updated_at || "",
});

const normalizePosterProgramType = (value) => (
  value === "hajj" ? "hajj" : "umrah"
);

const normalizeProgramPosterLevelsCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return 3;
  return Math.min(5, Math.max(1, Math.round(count)));
};

const normalizeProgramPosterAreas = (areas) => (
  Array.isArray(areas) ? areas : []
);

const toProgramPosterTemplate = (template, agencyId) => {
  const payload = {
    agency_id: agencyId,
    name: cleanString(template.name) || "Program poster template",
    program_type: normalizePosterProgramType(template.programType || template.program_type),
    levels_count: normalizeProgramPosterLevelsCount(template.levelsCount ?? template.levels_count),
    image_path: cleanString(template.imagePath || template.image_path),
    file_name: cleanString(template.fileName || template.file_name),
    file_size: toNullableFiniteNumber(template.fileSize ?? template.file_size),
    areas: normalizeProgramPosterAreas(template.areas),
    updated_at: new Date().toISOString(),
  };
  if (template.id) payload.id = template.id;
  return payload;
};

const fromProgramPosterTemplate = (row) => ({
  id: row.id,
  agencyId: row.agency_id,
  name: row.name || "",
  programType: normalizePosterProgramType(row.program_type),
  levelsCount: normalizeProgramPosterLevelsCount(row.levels_count),
  imagePath: row.image_path || "",
  fileName: row.file_name || "",
  fileSize: Number(row.file_size || 0),
  areas: normalizeProgramPosterAreas(row.areas),
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
  default_poster_template_type: a.defaultPosterTemplateType || a.default_poster_template_type || "official",
  default_poster_template_key:  a.defaultPosterTemplateKey ?? a.default_poster_template_key ?? "rukn",
  default_poster_template_id:   a.defaultPosterTemplateId || a.default_poster_template_id || null,
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
  defaultPosterTemplateType: row.default_poster_template_type || "official",
  defaultPosterTemplateKey: row.default_poster_template_key || "rukn",
  defaultPosterTemplateId: row.default_poster_template_id || "",
});

const fromAgencyNusukSettings = (row = {}) => row ? ({
  id: row.id || "",
  agencyId: row.agency_id || "",
  agency_id: row.agency_id || "",
  contactEmail: row.contact_email || "",
  contact_email: row.contact_email || "",
  phoneCountryCode: row.phone_country_code || "",
  phone_country_code: row.phone_country_code || "",
  phoneNumber: row.phone_number || "",
  phone_number: row.phone_number || "",
  postalCode: row.postal_code || "",
  postal_code: row.postal_code || "",
  createdBy: row.created_by || "",
  created_by: row.created_by || "",
  updatedBy: row.updated_by || "",
  updated_by: row.updated_by || "",
  createdAt: row.created_at || "",
  created_at: row.created_at || "",
  updatedAt: row.updated_at || "",
  updated_at: row.updated_at || "",
}) : null;

const toAgencyNusukSettingsRpcParams = (settings = {}) => ({
  p_contact_email: cleanString(settings.contactEmail ?? settings.contact_email) || "",
  p_phone_country_code: cleanString(settings.phoneCountryCode ?? settings.phone_country_code) || "",
  p_phone_number: cleanString(settings.phoneNumber ?? settings.phone_number) || "",
  p_postal_code: cleanString(settings.postalCode ?? settings.postal_code) || "",
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
        fetchPagedRows(() => supabase
          .from("programs")
          .select("id")
          .eq("agency_id", agencyId)
          .or("deleted.is.null,deleted.eq.false")
          .or("status.is.null,status.neq.archived")
          .order("id", { ascending: true })),
      ]);

      const error = clientsResult.error || paymentsResult.error || programsResult.error;
      if (error) return { data: null, error };

      const activeProgramIds = new Set((programsResult.data || []).map((program) => program.id));
      const activeClients = (clientsResult.data || []).filter((client) => (
        !client.program_id || activeProgramIds.has(client.program_id)
      ));
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
          totalPrograms: activeProgramIds.size,
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
    subscribe({ agencyId, programId, location, onChange = () => {}, onError = () => {} } = {}) {
      if (!supabase || !agencyId || !programId || !location) return () => {};
      const normalizedLocation = normalizeRoomingLocation(location);
      const matchesCurrentRoomingRow = (row) => (
        row
        && String(row.agency_id || "") === String(agencyId || "")
        && String(row.program_id || "") === String(programId || "")
        && normalizeRoomingLocation(row.location) === normalizedLocation
      );
      const channel = supabase
        .channel(`rooming-assignments:${agencyId}:${programId}:${normalizedLocation}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rooming_assignments",
            filter: `agency_id=eq.${agencyId}`,
          },
          (payload) => {
            const row = payload?.new || payload?.old;
            if (!matchesCurrentRoomingRow(row)) return;
            onChange(payload);
          }
        )
        .subscribe((status, error) => {
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && error) onError(error);
        });
      return () => {
        supabase.removeChannel(channel);
      };
    },
  },

  programs: {
    async fetchById(agencyId, programId) {
      if (!agencyId || !programId) return { data: null, error: null };
      const { data, error } = await supabase
        .from("programs")
        .select(PROGRAM_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("id", programId)
        .or("deleted.is.null,deleted.eq.false")
        .or("status.is.null,status.neq.archived")
        .maybeSingle();
      return { data: data ? fromProgram(data) : null, error };
    },
    async fetchPageSummary({
      search = "",
      year = null,
      type = "all",
      status = "all",
      limit = 12,
      offset = 0,
    } = {}) {
      const rpcName = "get_programs_page";
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 12));
      const safeOffset = Math.max(0, Number(offset) || 0);
      const yearNumber = toNullableFiniteNumber(year);
      const { data, error } = await supabase.rpc(rpcName, {
        p_search: typeof search === "string" ? search : "",
        p_year: yearNumber,
        p_type: String(type || "all").toLowerCase(),
        p_status: String(status || "all").toLowerCase(),
        p_limit: safeLimit,
        p_offset: safeOffset,
      });
      if (isMissingRpcError(error, rpcName)) {
        return {
          data: null,
          error: {
            ...error,
            isMissingMigration: true,
            missingRpc: rpcName,
          },
        };
      }
      if (error) return { data: null, error };
      return {
        data: normalizeProgramsPageSummary(data, {
          search,
          year: yearNumber,
          type,
          status,
          limit: safeLimit,
          offset: safeOffset,
        }),
        error: null,
      };
    },
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
        .select(PROGRAM_SELECT_COLUMNS)
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
    async setNusukUploadEnabled(id, agencyId, enabled) {
      if (!id || !agencyId) {
        return { data: null, error: new Error("missing-program-or-agency") };
      }
      const { data, error } = await supabase
        .from("programs")
        .update({
          nusuk_upload_enabled: Boolean(enabled),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("agency_id", agencyId)
        .select("id, nusuk_upload_enabled")
        .maybeSingle();
      if (error) return { data: null, error };
      if (!data) return { data: null, error: new Error("program-not-found") };
      return {
        data: {
          id: data.id,
          nusukUploadEnabled: Boolean(data.nusuk_upload_enabled),
          nusuk_upload_enabled: Boolean(data.nusuk_upload_enabled),
        },
        error: null,
      };
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
    async archiveRecord(id, agencyId) {
      const { error } = await supabase
        .from("programs")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("agency_id", agencyId);
      return { error };
    },
    async restoreRecord(id, agencyId) {
      const { error } = await supabase
        .from("programs")
        .update({ status: "active", updated_at: new Date().toISOString() })
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

  programTravelGroups: {
    async fetchCountsForPrograms(agencyId, programIds = []) {
      const ids = Array.from(new Set((programIds || []).map(String).filter(Boolean)));
      if (!agencyId || !ids.length) return { data: {}, error: null };
      const { data, error } = await supabase
        .from("program_travel_groups")
        .select("program_id")
        .eq("agency_id", agencyId)
        .in("program_id", ids);
      if (error) return { data: null, error };
      const counts = Object.fromEntries(ids.map((id) => [id, 0]));
      (data || []).forEach((row) => {
        const programId = String(row.program_id || "");
        if (programId) counts[programId] = (counts[programId] || 0) + 1;
      });
      return { data: counts, error: null };
    },
    async fetchByProgram(agencyId, programId) {
      if (!agencyId || !programId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("program_travel_groups")
        .select(PROGRAM_TRAVEL_GROUP_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("program_id", programId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return { data: data?.map(fromProgramTravelGroup) ?? [], error };
    },
    async create(group, agencyId) {
      if (!agencyId || !group?.programId) return { data: null, error: null };
      const { data, error } = await supabase
        .from("program_travel_groups")
        .insert(toProgramTravelGroup(group, agencyId))
        .select(PROGRAM_TRAVEL_GROUP_SELECT_COLUMNS)
        .single();
      return { data: data ? fromProgramTravelGroup(data) : null, error };
    },
    async update(group, agencyId) {
      if (!agencyId || !group?.id || !group?.programId) return { data: null, error: null };
      const { data, error } = await supabase
        .from("program_travel_groups")
        .update(toProgramTravelGroup(group, agencyId))
        .eq("id", group.id)
        .eq("agency_id", agencyId)
        .select(PROGRAM_TRAVEL_GROUP_SELECT_COLUMNS)
        .single();
      return { data: data ? fromProgramTravelGroup(data) : null, error };
    },
    async delete(id, agencyId) {
      if (!agencyId || !id) return { error: null };
      const { error } = await supabase
        .from("program_travel_groups")
        .delete()
        .eq("id", id)
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
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("registration_date", { ascending: false, nullsFirst: false });
      return { data: data?.map(fromClient) ?? null, error };
    },
    async fetchForProgram(agencyId, programId) {
      if (!agencyId || !programId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("program_id", programId)
        .or("deleted.is.null,deleted.eq.false")
        .or("archived.is.null,archived.eq.false")
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("registration_date", { ascending: false, nullsFirst: false });
      return { data: data?.map(fromClient) ?? [], error };
    },
    async clearTravelGroupAssignments(agencyId, programId, travelGroupId) {
      if (!agencyId || !programId || !travelGroupId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("clients")
        .update({ travel_group_id: null })
        .eq("agency_id", agencyId)
        .eq("program_id", programId)
        .eq("travel_group_id", travelGroupId)
        .select(CLIENT_SELECT_COLUMNS);
      return { data: data?.map(fromClient) ?? [], error };
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
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("registration_date", { ascending: false, nullsFirst: false })
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
        .select(CLIENT_SELECT_COLUMNS)
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
    async archiveRecord(id, agencyId, archivedAt = new Date().toISOString()) {
      if (!id || !agencyId) return { error: null };
      const { error } = await supabase
        .from("clients")
        .update({ archived: true, archived_at: archivedAt })
        .eq("id", id)
        .eq("agency_id", agencyId);
      return { error };
    },
    async restoreRecord(id, agencyId) {
      if (!id || !agencyId) return { error: null };
      const { error } = await supabase
        .from("clients")
        .update({ archived: false, archived_at: null })
        .eq("id", id)
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
    async fetchDeletedRelatedCounts(agencyId, ids = []) {
      const clientIds = Array.from(new Set((ids || []).filter(Boolean)));
      if (!agencyId || !clientIds.length) return { data: [], error: null };
      const rpcName = "get_deleted_client_related_counts";
      const { data, error } = await supabase.rpc(rpcName, {
        p_agency_id: agencyId,
        p_client_ids: clientIds,
      });
      if (isMissingRpcError(error, rpcName)) {
        return {
          data: [],
          error: {
            ...error,
            isMissingMigration: true,
            missingRpc: rpcName,
          },
        };
      }
      return { data: data?.map(fromDeletedClientRelatedCounts) ?? [], error };
    },
    async fetchDeletedLinkedActiveRecords(agencyId, ids = []) {
      const clientIds = Array.from(new Set((ids || []).filter(Boolean)));
      if (!agencyId || !clientIds.length) {
        return { data: { clients: [], programs: [], payments: [], invoices: [] }, error: null };
      }

      const clientsResult = await supabase
        .from("clients")
        .select(CLIENT_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("deleted", true)
        .in("id", clientIds);
      if (clientsResult.error) return { data: null, error: clientsResult.error };

      const clientRows = Array.isArray(clientsResult.data) ? clientsResult.data : [];
      const eligibleClientIds = clientRows.map((client) => client.id).filter(Boolean);
      if (!eligibleClientIds.length) {
        return { data: { clients: [], programs: [], payments: [], invoices: [] }, error: null };
      }

      const [paymentsResult, invoicesResult] = await Promise.all([
        supabase
          .from("payments")
          .select(PAYMENT_SELECT_COLUMNS)
          .eq("agency_id", agencyId)
          .in("client_id", eligibleClientIds)
          .order("date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select(INVOICE_SELECT_COLUMNS)
          .eq("agency_id", agencyId)
          .in("client_id", eligibleClientIds.map(String))
          .order("issue_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);
      const recordsError = paymentsResult.error || invoicesResult.error;
      if (recordsError) return { data: null, error: recordsError };

      const activePaymentRows = (paymentsResult.data || []).filter((payment) => !isInactiveLinkedPaymentRecord(payment));
      const activeInvoiceRows = (invoicesResult.data || []).filter(isActiveLinkedInvoiceRecord);
      const programIds = Array.from(new Set([
        ...clientRows.map((client) => client.program_id).filter(Boolean),
        ...activeInvoiceRows.map((invoice) => invoice.program_id).filter(Boolean),
      ]));

      let programRows = [];
      if (programIds.length) {
        const programsResult = await supabase
          .from("programs")
          .select(PROGRAM_SELECT_COLUMNS)
          .eq("agency_id", agencyId)
          .in("id", programIds);
        if (programsResult.error) return { data: null, error: programsResult.error };
        programRows = programsResult.data || [];
      }

      return {
        data: {
          clients: clientRows.map(fromClient),
          programs: programRows.map(fromProgram),
          payments: activePaymentRows.map(fromPayment),
          invoices: activeInvoiceRows.map(fromInvoice),
        },
        error: null,
      };
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
    async fetchForClientIds(agencyId, clientIds = []) {
      const ids = Array.from(new Set((Array.isArray(clientIds) ? clientIds : [])
        .map(normalizeForeignKey)
        .filter(Boolean)));
      if (!agencyId || !ids.length) return { data: [], error: null };

      const results = await Promise.all(chunkArray(ids).map((chunk) => supabase
        .from("payments")
        .select(PAYMENT_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .in("client_id", chunk)
        .or("status.is.null,status.eq.active")
        .is("trashed_at", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })));

      const error = results.find((result) => result.error)?.error || null;
      if (error) return { data: null, error };

      const rows = results
        .flatMap((result) => Array.isArray(result.data) ? result.data : [])
        .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
      return { data: rows.map(fromPayment), error: null };
    },
    async fetchTrashed(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("payments").select(PAYMENT_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("status", "trashed")
        .order("trashed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return { data: data?.map(fromPayment) ?? [], error };
    },
    async upsert(payment, agencyId) {
      if (isPreviousPaymentRecord(payment)) {
        return this.createPrevious(payment, agencyId);
      }
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
    async createPrevious(payment, agencyId) {
      const { data, error } = await supabase.rpc("create_previous_payment", {
        p_agency_id: agencyId,
        p_client_id: normalizeForeignKey(payment.clientId),
        p_amount: payment.amount,
        p_date: payment.date ?? null,
        p_method: payment.method ?? payment.paymentMethod ?? payment.payment_method ?? null,
        p_note: payment.note ?? payment.notes ?? null,
        p_cheque_number: cleanString(payment.chequeNumber ?? payment.cheque_number ?? payment.checkNumber ?? payment.check_number),
        p_paid_by: cleanString(payment.paidBy ?? payment.paid_by),
        p_legacy_receipt_number: cleanString(payment.legacyReceiptNumber ?? payment.legacy_receipt_number),
        p_payment_id: payment.id ?? null,
      });
      return { data: data ? fromPayment(data) : null, error };
    },
    async createSharedReceipt(payload = {}, agencyId) {
      const coveredClients = Array.isArray(payload.coveredClients || payload.covered_clients)
        ? (payload.coveredClients || payload.covered_clients)
        : [];
      const { data, error } = await supabase.rpc("create_shared_receipt", {
        p_agency_id: agencyId,
        p_program_id: normalizeForeignKey(payload.programId ?? payload.program_id),
        p_payer_client_id: normalizeForeignKey(payload.payerClientId ?? payload.payer_client_id),
        p_payer_name: cleanString(payload.payerName ?? payload.payer_name),
        p_payment_type: payload.paymentType ?? payload.payment_type ?? "normal",
        p_payment_method: payload.paymentMethod ?? payload.payment_method ?? payload.method ?? null,
        p_receipt_number: cleanString(payload.receiptNumber ?? payload.receipt_number ?? payload.legacyReceiptNumber ?? payload.legacy_receipt_number),
        p_cheque_number: cleanString(payload.chequeNumber ?? payload.cheque_number ?? payload.checkNumber ?? payload.check_number),
        p_paid_by: cleanString(payload.paidBy ?? payload.paid_by),
        p_payment_date: payload.paymentDate ?? payload.payment_date ?? payload.date ?? null,
        p_total_amount: payload.totalAmount ?? payload.total_amount ?? payload.amount ?? null,
        p_notes: payload.notes ?? payload.note ?? null,
        p_covered_clients: coveredClients,
      });
      const parsed = parseRpcJson(data) || {};
      return {
        data: data ? {
          paymentGroup: parsed.payment_group ? fromPaymentGroup(parsed.payment_group) : null,
          payment_group: parsed.payment_group ? fromPaymentGroup(parsed.payment_group) : null,
          payments: Array.isArray(parsed.payments) ? parsed.payments.map(fromPayment) : [],
          receiptNumber: parsed.receipt_number || "",
          receipt_number: parsed.receipt_number || "",
        } : null,
        error,
      };
    },
    async fetchPaymentGroup(id, agencyId) {
      if (!id || !agencyId) return { data: null, error: null };
      const { data, error } = await supabase
        .from("payment_groups")
        .select(PAYMENT_GROUP_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("id", id)
        .maybeSingle();
      return { data: data ? fromPaymentGroup(data) : null, error };
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
        .select(INVOICE_SELECT_COLUMNS)
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
        .select(INVOICE_SELECT_COLUMNS)
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
        .select(INVOICE_SELECT_COLUMNS)
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
        .select(INVOICE_SELECT_COLUMNS)
        .single();
      return { data: data ? fromInvoice(data) : null, error };
    },
  },

  trash: {
    async fetchPage({ filter = "all", page = 1, pageSize = 25 } = {}) {
      const safePage = Math.max(1, Number(page) || 1);
      const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
      const safeFilter = String(filter || "all").trim().toLowerCase() || "all";
      const offset = (safePage - 1) * safePageSize;
      const rpcName = "get_trash_page";
      const { data, error } = await supabase.rpc(rpcName, {
        p_item_type: safeFilter,
        p_limit: safePageSize,
        p_offset: offset,
      });
      if (isMissingRpcError(error, rpcName)) {
        return {
          data: null,
          error: {
            ...error,
            isMissingMigration: true,
            missingRpc: rpcName,
          },
        };
      }
      if (error) return { data: null, error };
      const normalized = normalizeTrashPage(data, { page: safePage, pageSize: safePageSize, filter: safeFilter });
      if ((safeFilter === "hajj" || safeFilter === "umrah" || safeFilter === "unassigned") && normalized.filter !== safeFilter) {
        return {
          data: null,
          error: {
            message: "Trash RPC does not support this client-kind filter yet",
            code: "TRASH_RPC_FILTER_UNSUPPORTED",
            isMissingMigration: true,
            missingRpc: rpcName,
          },
        };
      }
      return { data: normalized, error: null };
    },

    async fetchProgramContext(agencyId, programIds = []) {
      const ids = Array.from(new Set((programIds || []).filter(Boolean)));
      if (!agencyId || !ids.length) {
        return { data: { deletedPrograms: [], deletedClients: [], activeClients: [] }, error: null };
      }

      const programsResult = await supabase
        .from("programs")
        .select(PROGRAM_SELECT_COLUMNS)
        .eq("agency_id", agencyId)
        .eq("deleted", true)
        .in("id", ids);
      if (programsResult.error) return { data: null, error: programsResult.error };

      const programRows = Array.isArray(programsResult.data) ? programsResult.data : [];
      const batchIds = Array.from(new Set(programRows.map((program) => program.deleted_batch_id).filter(Boolean)));

      const [activeClientsResult, deletedClientsByProgramResult, deletedClientsByBatchResult] = await Promise.all([
        supabase
          .from("clients")
          .select(CLIENT_SELECT_COLUMNS)
          .eq("agency_id", agencyId)
          .eq("deleted", false)
          .in("program_id", ids),
        supabase
          .from("clients")
          .select(CLIENT_SELECT_COLUMNS)
          .eq("agency_id", agencyId)
          .eq("deleted", true)
          .in("program_id", ids),
        batchIds.length
          ? supabase
              .from("clients")
              .select(CLIENT_SELECT_COLUMNS)
              .eq("agency_id", agencyId)
              .eq("deleted", true)
              .in("deleted_batch_id", batchIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const error = activeClientsResult.error || deletedClientsByProgramResult.error || deletedClientsByBatchResult.error;
      if (error) return { data: null, error };

      const deletedClientRowsById = new Map();
      [...(deletedClientsByProgramResult.data || []), ...(deletedClientsByBatchResult.data || [])].forEach((client) => {
        if (client?.id) deletedClientRowsById.set(client.id, client);
      });

      return {
        data: {
          deletedPrograms: programRows.map(fromProgram),
          deletedClients: Array.from(deletedClientRowsById.values()).map(fromClient),
          activeClients: (activeClientsResult.data || []).map(fromClient),
        },
        error: null,
      };
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
      if (process.env.NODE_ENV !== "production") {
        console.debug("badge template insert payload", payload);
      }
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
      const missingThumbnailColumn = error && (
        String(error.message || "").includes("thumbnail_path")
        || String(error.details || "").includes("thumbnail_path")
        || String(error.hint || "").includes("thumbnail_path")
      );
      if (missingThumbnailColumn) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.thumbnail_path;
        console.warn("badge template thumbnail_path column is missing; retrying template save without thumbnail_path");
        const retry = await supabase
          .from("badge_templates")
          .upsert(fallbackPayload, { onConflict: "id" })
          .select("*")
          .single();
        if (retry.error) {
          console.error("badge template insert error", retry.error);
        }
        return { data: retry.data ? fromBadgeTemplate(retry.data) : null, error: retry.error };
      }
      if (error) {
        console.error("badge template insert error", error);
      }
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

  programPosterTemplates: {
    async fetchAll(agencyId) {
      if (!agencyId) return { data: [], error: null };
      const { data, error } = await supabase
        .from("program_poster_templates")
        .select("*")
        .eq("agency_id", agencyId)
        .order("updated_at", { ascending: false });
      return { data: data?.map(fromProgramPosterTemplate) ?? [], error };
    },
    async upsert(template, agencyId) {
      if (!agencyId) return { data: null, error: null };
      const payload = toProgramPosterTemplate(template, agencyId);
      const { data, error } = await supabase
        .from("program_poster_templates")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();
      return { data: data ? fromProgramPosterTemplate(data) : null, error };
    },
    async delete(id, agencyId) {
      if (!agencyId || !id) return { error: null };
      const { error } = await supabase
        .from("program_poster_templates")
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

  agencyNusukSettings: {
    async fetch() {
      const { data, error } = await supabase
        .from("agency_nusuk_settings")
        .select("id, agency_id, contact_email, phone_country_code, phone_number, postal_code, created_by, updated_by, created_at, updated_at")
        .maybeSingle();
      return { data: data ? fromAgencyNusukSettings(data) : null, error };
    },
    async upsert(settings = {}) {
      const rpcName = "upsert_agency_nusuk_settings";
      const { data, error } = await supabase.rpc(
        rpcName,
        toAgencyNusukSettingsRpcParams(settings)
      );
      if (isMissingRpcError(error, rpcName)) {
        return {
          data: null,
          error: {
            ...error,
            isMissingMigration: true,
            missingRpc: rpcName,
          },
        };
      }
      return { data: data ? fromAgencyNusukSettings(data) : null, error };
    },
  },

  activityLog: {
    mapRow(row) {
      if (!row) return null;
      return {
        id:          row.id,
        agencyId:    row.agency_id,
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
          ...(entry.id ? { id: entry.id } : {}),
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
    subscribe({ agencyId, onInsert = () => {}, onError = () => {} } = {}) {
      if (!supabase || !agencyId) return () => {};
      const matchesCurrentAgency = (row) => (
        row && String(row.agency_id || "") === String(agencyId || "")
      );
      const channel = supabase
        .channel(`activity-log:${agencyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_log",
            filter: `agency_id=eq.${agencyId}`,
          },
          (payload) => {
            const row = payload?.new;
            if (!matchesCurrentAgency(row)) return;
            onInsert(db.activityLog.mapRow(row), payload);
          }
        )
        .subscribe((status, error) => {
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && error) onError(error);
        });
      return () => {
        supabase.removeChannel(channel);
      };
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
    if (!agencyId) return () => {};

    const handleStatus = (channelName) => (status, error) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Realtime] ${channelName}: ${status}`, error || "");
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || error) {
        console.error(`[Realtime] ${channelName} subscription failed: ${status}`, error || "");
      }
    };
    const agencyScopedChanges = (table) => ({
      event: "*",
      schema: "public",
      table,
      ...(agencyId ? { filter: `agency_id=eq.${agencyId}` } : {}),
    });

    const mainChannel = supabase
      .channel(`db-changes:${agencyId || "all"}`)
      .on("postgres_changes", agencyScopedChanges("programs"), onProgram)
      .on("postgres_changes", agencyScopedChanges("clients"), onClient)
      .on("postgres_changes", agencyScopedChanges("payments"), onPayment)
      .subscribe(handleStatus("programs/clients/payments"));

    const notificationsChannel = supabase
      .channel(`db-notifications:${agencyId || "all"}`)
      .on("postgres_changes", agencyScopedChanges("notifications"), onNotification)
      .subscribe(handleStatus("notifications"));

    return () => {
      supabase.removeChannel(mainChannel);
      supabase.removeChannel(notificationsChannel);
    };
  },
};
