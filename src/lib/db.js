/**
 * db.js — All Supabase CRUD operations with camelCase ↔ snake_case mapping.
 * Every operation explicitly scopes data to the provided agencyId (defense-in-depth
 * on top of Supabase RLS policies).
 */
import { supabase } from "./supabase";

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
  status:      row.status,
});

const toClient = (c, agencyId) => ({
  id:                c.id,
  agency_id:         agencyId,
  program_id:        c.programId        ?? null,
  name:              c.name             ?? null,
  first_name:        c.firstName        ?? null,
  last_name:         c.lastName         ?? null,
  nom:               c.nom              ?? null,
  prenom:            c.prenom           ?? null,
  phone:             c.phone            ?? null,
  city:              c.city             ?? null,
  hotel_level:       c.hotelLevel       ?? null,
  hotel_mecca:       c.hotelMecca       ?? null,
  hotel_madina:      c.hotelMadina      ?? null,
  room_type:         c.roomType         ?? null,
  official_price:    c.officialPrice    ?? 0,
  sale_price:        c.salePrice        ?? c.price ?? 0,
  ticket_no:         c.ticketNo         ?? null,
  passport:          c.passport         ?? {},
  docs:              c.docs             ?? {},
  notes:             c.notes            ?? null,
  registration_date: c.registrationDate ?? null,
  last_modified:     c.lastModified     ?? null,
  archived:          c.archived         ?? false,
  archived_at:       c.archivedAt       ?? null,
});

const fromClient = (row) => ({
  id:               row.id,
  programId:        row.program_id,
  name:             row.name,
  firstName:        row.first_name,
  lastName:         row.last_name,
  nom:              row.nom,
  prenom:           row.prenom,
  phone:            row.phone,
  city:             row.city,
  hotelLevel:       row.hotel_level,
  hotelMecca:       row.hotel_mecca,
  hotelMadina:      row.hotel_madina,
  roomType:         row.room_type,
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
});

const toPayment = (p, agencyId) => ({
  id:         p.id,
  agency_id:  agencyId,
  client_id:  p.clientId,
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
        .from("programs").select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: true });
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
  },

  clients: {
    async fetchAll(agencyId) {
      const { data, error } = await supabase
        .from("clients").select("*")
        .eq("agency_id", agencyId)
        .order("registration_date", { ascending: true });
      return { data: data?.map(fromClient) ?? null, error };
    },
    async upsert(client, agencyId) {
      const { error } = await supabase
        .from("clients").upsert(toClient(client, agencyId), { onConflict: "id" });
      return { error };
    },
    async delete(id, agencyId) {
      const { error } = await supabase
        .from("clients").delete().eq("id", id).eq("agency_id", agencyId);
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
    async fetchRecent(agencyId, limit = 50) {
      const { data, error } = await supabase
        .from("activity_log").select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return {
        data: data?.map(r => ({
          id:          r.id,
          type:        r.type,
          description: r.description,
          clientName:  r.client_name,
          time:        r.created_at,
        })) ?? null,
        error,
      };
    },
    async insert(agencyId, userId, entry) {
      const { error } = await supabase
        .from("activity_log")
        .insert({
          agency_id:   agencyId,
          user_id:     userId ?? null,
          type:        entry.type,
          description: entry.description,
          client_name: entry.clientName || null,
        });
      return { error };
    },
  },

  users: {
    async fetchProfile(userId) {
      const { data, error } = await supabase
        .from("users").select("id, agency_id, role, full_name")
        .eq("id", userId).single();
      return { data, error };
    },
  },

  // Realtime subscriptions
  subscribeAll({ onProgram, onClient, onPayment }) {
    return supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, onProgram)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients"  }, onClient)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, onPayment)
      .subscribe();
  },
};
