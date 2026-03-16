-- ============================================================
-- UMRAH PRO — Supabase Schema (Multi-Tenant)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Run the entire file at once.
-- ============================================================

-- ── 0. Extensions ────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 1. Tables ─────────────────────────────────────────────────

-- Agencies (one row per travel agency)
create table if not exists public.agencies (
  id               uuid primary key default gen_random_uuid(),
  name_ar          text,
  name_fr          text,
  address_tiznit   text,
  address_agadir   text,
  phone_tiznit1    text,
  phone_tiznit2    text,
  phone_agadir1    text,
  phone_agadir2    text,
  ice              text,
  rc               text,
  email            text,
  website          text,
  created_at       timestamptz default now()
);

-- User profiles (linked to auth.users)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  role        text not null check (role in ('owner','agent')) default 'agent',
  full_name   text,
  created_at  timestamptz default now()
);

-- Programs
create table if not exists public.programs (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  name         text not null,
  name_fr      text,
  type         text,
  duration     text,
  departure    text,
  return_date  text,
  transport    text,
  meal_plan    text,
  seats        integer not null default 40,
  hotel_mecca  text,
  hotel_madina text,
  notes        text,
  price_table  jsonb not null default '[]',
  status       text not null default 'active',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Clients
create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  agency_id          uuid not null references public.agencies(id) on delete cascade,
  program_id         uuid references public.programs(id) on delete set null,
  name               text,
  first_name         text,
  last_name          text,
  nom                text,
  prenom             text,
  phone              text,
  city               text,
  hotel_level        text,
  hotel_mecca        text,
  hotel_madina       text,
  room_type          text,
  official_price     numeric not null default 0,
  sale_price         numeric not null default 0,
  ticket_no          text,
  notes              text,
  passport           jsonb not null default '{}',
  docs               jsonb not null default '{}',
  archived           boolean not null default false,
  archived_at        timestamptz,
  registration_date  date,
  last_modified      date,
  created_at         timestamptz default now()
);

-- Payments
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  amount      numeric not null default 0,
  date        date,
  method      text,
  receipt_no  text,
  note        text,
  created_at  timestamptz default now()
);

-- Activity log
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  type         text,
  description  text,
  client_name  text,
  created_at   timestamptz default now()
);

-- ── 2. Performance Indexes ────────────────────────────────────
create index if not exists idx_users_agency       on public.users(agency_id);
create index if not exists idx_programs_agency    on public.programs(agency_id);
create index if not exists idx_clients_agency     on public.clients(agency_id);
create index if not exists idx_clients_program    on public.clients(program_id);
create index if not exists idx_clients_archived   on public.clients(agency_id, archived);
create index if not exists idx_payments_agency    on public.payments(agency_id);
create index if not exists idx_payments_client    on public.payments(client_id);
create index if not exists idx_activity_agency    on public.activity_log(agency_id);

-- ── 3. RLS Helper Function ────────────────────────────────────
-- Returns the agency_id for the currently authenticated user.
-- SECURITY DEFINER: runs as function owner (bypasses users RLS),
-- which is safe because the function only reads the caller's own row.
create or replace function public.get_agency_id()
returns uuid
language sql
security definer
stable
as $$
  select agency_id
  from   public.users
  where  id = auth.uid()
  limit  1;
$$;

-- ── 4. Enable Row Level Security ─────────────────────────────
alter table public.agencies     enable row level security;
alter table public.users        enable row level security;
alter table public.programs     enable row level security;
alter table public.clients      enable row level security;
alter table public.payments     enable row level security;
alter table public.activity_log enable row level security;

-- ── 5. RLS Policies ───────────────────────────────────────────

-- agencies: each user sees and edits only their own agency
drop policy if exists "agencies_select" on public.agencies;
drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_select" on public.agencies
  for select using (id = public.get_agency_id());
create policy "agencies_update" on public.agencies
  for update using (id = public.get_agency_id());

-- users: each user sees only their own profile row
drop policy if exists "users_select" on public.users;
drop policy if exists "users_update" on public.users;
create policy "users_select" on public.users
  for select using (id = auth.uid());
create policy "users_update" on public.users
  for update using (id = auth.uid());

-- programs
drop policy if exists "programs_select" on public.programs;
drop policy if exists "programs_insert" on public.programs;
drop policy if exists "programs_update" on public.programs;
drop policy if exists "programs_delete" on public.programs;
create policy "programs_select" on public.programs
  for select using (agency_id = public.get_agency_id());
create policy "programs_insert" on public.programs
  for insert with check (agency_id = public.get_agency_id());
create policy "programs_update" on public.programs
  for update using (agency_id = public.get_agency_id());
create policy "programs_delete" on public.programs
  for delete using (agency_id = public.get_agency_id());

-- clients
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
create policy "clients_select" on public.clients
  for select using (agency_id = public.get_agency_id());
create policy "clients_insert" on public.clients
  for insert with check (agency_id = public.get_agency_id());
create policy "clients_update" on public.clients
  for update using (agency_id = public.get_agency_id());
create policy "clients_delete" on public.clients
  for delete using (agency_id = public.get_agency_id());

-- payments
drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;
create policy "payments_select" on public.payments
  for select using (agency_id = public.get_agency_id());
create policy "payments_insert" on public.payments
  for insert with check (agency_id = public.get_agency_id());
create policy "payments_update" on public.payments
  for update using (agency_id = public.get_agency_id());
create policy "payments_delete" on public.payments
  for delete using (agency_id = public.get_agency_id());

-- activity_log
drop policy if exists "activity_select" on public.activity_log;
drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_select" on public.activity_log
  for select using (agency_id = public.get_agency_id());
create policy "activity_insert" on public.activity_log
  for insert with check (agency_id = public.get_agency_id());

-- ── 6. Trigger: auto-create user profile on auth signup ───────
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Create profile only when agency_id is supplied in user metadata.
  -- Pass it like: supabase.auth.signUp({ email, password,
  --   options: { data: { agency_id, role, full_name } } })
  if new.raw_user_meta_data->>'agency_id' is not null then
    insert into public.users (id, agency_id, role, full_name)
    values (
      new.id,
      (new.raw_user_meta_data->>'agency_id')::uuid,
      coalesce(new.raw_user_meta_data->>'role', 'agent'),
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ── 7. Onboarding helper ───────────────────────────────────────
-- Use this function (via Supabase dashboard) to create a new agency
-- and get its UUID to use when creating the first owner user.
--
-- Example:
--   select create_new_agency('وكالة اسم', 'Agency Name FR');
--   -- Returns agency UUID
--   -- Then in Supabase Auth > Users, create user with metadata:
--   --   { "agency_id": "<uuid>", "role": "owner", "full_name": "الاسم" }
create or replace function public.create_new_agency(
  p_name_ar text,
  p_name_fr text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.agencies (name_ar, name_fr)
  values (p_name_ar, p_name_fr)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Done ──────────────────────────────────────────────────────
-- Summary of steps after running this SQL:
-- 1. Run: select create_new_agency('اسم الوكالة', 'Agency Name');
--    → Copy the returned UUID
-- 2. In Supabase Dashboard → Authentication → Users → Invite user
--    Set user metadata: { "agency_id": "<uuid>", "role": "owner" }
-- 3. User receives email, sets password, and can log in.
-- ─────────────────────────────────────────────────────────────
