/**
 * db.js — All Supabase CRUD operations with camelCase ↔ snake_case mapping.
 * Every operation explicitly scopes data to the provided agencyId (defense-in-depth
 * on top of Supabase RLS policies).
 */
import { supabase } from "./supabase";
import { buildNotificationStateHash } from "../utils/notifications";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientIdentityName } from "../utils/clientNames";

const normalizeForeignKey = (value) => (
  typeof value === "string" && value.trim() ? value : null
);

const cleanString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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
  priceTable:  row.price_table ?? [],
  notes:       row.notes,
  deleted:     row.deleted ?? false,
  deletedAt:   row.deleted_at,
  deletedBatchId: row.deleted_batch_id,
  status:      row.status,
});

const toClient = (c, agencyId) => {
  const normalizedGender = normalizeGender(c.gender || c.passport?.gender);
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
  const passport = {
    ...(c.passport ?? {}),
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
  city:              cleanString(c.city),
  hotel_level:       cleanString(c.packageLevel ?? c.hotelLevel),
  hotel_mecca:       cleanString(c.hotelMecca),
  hotel_madina:      cleanString(c.hotelMadina),
  room_type:         cleanString(c.roomType),
  official_price:    c.officialPrice    ?? 0,
  sale_price:        c.salePrice        ?? c.price ?? 0,
  ticket_no:         cleanString(c.ticketNo),
  passport:          passport,
  docs:              { ...(c.docs ?? {}), ...(rooming ? { rooming } : {}) },
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
  city:             row.city,
  hotelLevel:       row.hotel_level,
  packageLevel:     row.hotel_level,
  hotelMecca:       row.hotel_mecca,
  hotelMadina:      row.hotel_madina,
  roomType:         row.room_type,
  roomTypeLabel:    getRoomTypeLabel(row.room_type),
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
  passport:         row.passport ?? {},
  docs:             row.docs ?? {},
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
  method:     p.method    ?? null,
  receipt_no: p.receiptNo ?? null,
  note:       p.note      ?? null,
});

const fromPayment = (row) => ({
  id:        row.id,
  clientId:  row.client_id,
  amount:    Number(row.amount),
  date:      row.date,
  method:    row.method,
  receiptNo: row.receipt_no,
  note:      row.note,
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
});

const fromAgency = (row) => ({
  nameAr:        row.name_ar,
  nameFr:        row.name_fr,
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
});

// ─── DB operations ────────────────────────────────────────────────────────────

export const db = {

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
        .order("created_at", { ascending: true });
      return { data: data?.map(fromPayment) ?? null, error };
    },
    async upsert(payment, agencyId) {
      const { error } = await supabase
        .from("payments").upsert(toPayment(payment, agencyId), { onConflict: "id" });
      return { error };
    },
    async delete(id, agencyId) {
      const { error } = await supabase
        .from("payments").delete().eq("id", id).eq("agency_id", agencyId);
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
          .eq("id", existing.id);
        return { error: updateError };
      }

      const { error } = await supabase
        .from("notifications")
        .insert(payload);
      return { error };
    },
    async markRead(id, isRead = true) {
      const { error } = await supabase
        .from("notifications").update({ is_read: isRead }).eq("id", id);
      return { error };
    },
    async markManyRead(ids) {
      if (!ids || ids.length === 0) return { error: null };
      const { error } = await supabase
        .from("notifications").update({ is_read: true }).in("id", ids);
      return { error };
    },
    async markArchived(id, archived = true) {
      const { error } = await supabase
        .from("notifications").update({ is_archived: archived }).eq("id", id);
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
      if (from) {
        query = query.gte("created_at", from);
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`description.ilike.${term},client_name.ilike.${term}`);
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
    async archiveOld(agencyId, days = 180) {
      if (!agencyId) return { data: null, error: null };
      const { data, error } = await supabase
        .rpc("archive_activity_log", { days_threshold: days });
      return { data, error };
    },
  },

  users: {
    async fetchProfile(userId) {
      const { data, error } = await supabase
        .from("users").select("id, agency_id, role, full_name")
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
  subscribeAll({ onProgram = () => {}, onClient = () => {}, onPayment = () => {}, onNotification = () => {} }) {
    return supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, onProgram)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients"  }, onClient)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, onPayment)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onNotification)
      .subscribe();
  },
};
