-- LEGACY ONLY. Do not run on current Rukn production/staging Supabase.
-- Replaced by /SUPABASE_SCHEMA.sql multi-tenant schema.
-- Kept only for historical reference.

-- ═══════════════════════════════════════════════════════════════════════════
-- Umrah Pro — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Agency (single row, id = 'default') ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency (
  id               TEXT PRIMARY KEY DEFAULT 'default',
  name_ar          TEXT,
  name_fr          TEXT,
  address_tiznit   TEXT,
  address_agadir   TEXT,
  phone_tiznit_1   TEXT,
  phone_tiznit_2   TEXT,
  phone_agadir_1   TEXT,
  phone_agadir_2   TEXT,
  ice              TEXT,
  rc               TEXT,
  email            TEXT,
  website          TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Programs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT,
  duration     TEXT,
  departure    DATE,
  return_date  DATE,
  transport    TEXT,
  meal_plan    TEXT,
  seats        INTEGER DEFAULT 40,
  hotel_mecca  TEXT,
  hotel_madina TEXT,
  price_table  JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Clients ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                TEXT PRIMARY KEY,
  program_id        TEXT REFERENCES programs(id) ON DELETE SET NULL,
  name              TEXT,
  first_name        TEXT,
  last_name         TEXT,
  nom               TEXT,
  prenom            TEXT,
  phone             TEXT,
  city              TEXT,
  hotel_level       TEXT,
  hotel_mecca       TEXT,
  hotel_madina      TEXT,
  room_type         TEXT,
  official_price    NUMERIC(10,2) DEFAULT 0,
  sale_price        NUMERIC(10,2) DEFAULT 0,
  ticket_no         TEXT,
  passport          JSONB NOT NULL DEFAULT '{}',
  docs              JSONB NOT NULL DEFAULT '{}',
  notes             TEXT,
  registration_date DATE,
  last_modified     DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id         TEXT PRIMARY KEY,
  client_id  TEXT REFERENCES clients(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL,
  date       DATE,
  method     TEXT,
  receipt_no TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE agency   ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Open policies (private single-agency app — no auth required)
-- To restrict access, replace TRUE with: auth.role() = 'authenticated'

CREATE POLICY "allow_all" ON agency   FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all" ON programs FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all" ON clients  FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "allow_all" ON payments FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_clients_program_id  ON clients(program_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id  ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_last_mod    ON clients(last_modified DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Enable Realtime on all tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE programs;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
