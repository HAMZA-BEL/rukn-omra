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
  agency_city      text,
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
  bank_name        text,
  bank_account_holder text,
  bank_rib         text,
  bank_iban        text,
  bank_note        text,
  created_at       timestamptz default now()
);

alter table public.agencies add column if not exists agency_city text;
alter table public.agencies add column if not exists bank_name text;
alter table public.agencies add column if not exists bank_account_holder text;
alter table public.agencies add column if not exists bank_rib text;
alter table public.agencies add column if not exists bank_iban text;
alter table public.agencies add column if not exists bank_note text;

-- User profiles (linked to auth.users)
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  role          text not null check (role in ('owner','manager','staff')) default 'staff',
  status        text not null check (status in ('active','disabled','invited')) default 'active',
  invited_at    timestamptz,
  invited_by    uuid references public.users(id),
  last_login    timestamptz,
  disabled_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
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
  badge_guide_phone   text,
  badge_saudi_phone_1 text,
  badge_saudi_phone_2 text,
  badge_note          text,
  badge_template_id   text,
  notes        text,
  deleted      boolean not null default false,
  deleted_at   timestamptz,
  deleted_batch_id uuid,
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
  deleted            boolean not null default false,
  deleted_at         timestamptz,
  deleted_batch_id   uuid,
  registration_date  date,
  last_modified      date,
  created_at         timestamptz default now()
);

alter table public.programs add column if not exists badge_guide_phone text;
alter table public.programs add column if not exists badge_saudi_phone_1 text;
alter table public.programs add column if not exists badge_saudi_phone_2 text;
alter table public.programs add column if not exists badge_note text;
alter table public.programs add column if not exists badge_template_id text;

-- Badge templates
create table if not exists public.badge_templates (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  name          text not null,
  description   text,
  template_path text,
  width_mm      numeric not null default 90,
  height_mm     numeric not null default 140,
  layout        jsonb not null default '{}'::jsonb,
  is_default    boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.badge_templates add column if not exists description text;

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

-- Final official invoices
create table if not exists public.invoice_counters (
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  invoice_year  integer not null,
  last_number   integer not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (agency_id, invoice_year)
);

create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  client_id           text,
  program_id          text,
  invoice_number      integer not null,
  invoice_display_number text not null,
  invoice_year        integer not null,
  issue_date          date not null,
  status              text not null default 'issued' check (status in ('issued','trashed','deleted')),
  recipient_type      text not null check (recipient_type in ('client','company')),
  recipient_snapshot  jsonb not null default '{}'::jsonb,
  program_snapshot    jsonb not null default '{}'::jsonb,
  amount_snapshot     jsonb not null default '{}'::jsonb,
  payment_references  jsonb not null default '[]'::jsonb,
  invoice_key         text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  trashed_at          timestamptz,
  deleted_at          timestamptz,
  constraint invoices_agency_year_number_unique unique (agency_id, invoice_year, invoice_number)
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

create table if not exists public.activity_log_archive (
  id           uuid primary key,
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  type         text,
  description  text,
  client_name  text,
  created_at   timestamptz default now(),
  archived_at  timestamptz default now()
);

drop view if exists public.activity_log_all;
create view public.activity_log_all as
  select id, agency_id, user_id, type, description, client_name, created_at, false as is_archived
  from public.activity_log
  union all
  select id, agency_id, user_id, type, description, client_name, created_at, true as is_archived
  from public.activity_log_archive;

-- Notifications
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  type         text,
  title        text,
  message      text,
  program_id   uuid references public.programs(id) on delete set null,
  target_type  text,
  target_id    uuid,
  action_route text,
  state_hash   text,
  meta         jsonb not null default '{}'::jsonb,
  severity     text not null default 'info',
  is_read      boolean not null default false,
  is_archived  boolean not null default false,
  created_at   timestamptz default now()
);

alter table if exists public.notifications
  add column if not exists target_type  text,
  add column if not exists target_id    uuid,
  add column if not exists action_route text,
  add column if not exists state_hash   text,
  add column if not exists meta         jsonb not null default '{}'::jsonb;

-- Backfill legacy rows to ensure actionable metadata exists for dedupe logic.
update public.notifications
set target_type = coalesce(target_type, case when program_id is not null then 'program' else target_type end),
    target_id   = coalesce(target_id, program_id),
    action_route = coalesce(action_route, case when program_id is not null then 'programs' else action_route end)
where target_type is null or target_id is null or action_route is null;

update public.notifications
set state_hash = coalesce(
  state_hash,
  concat_ws(
    ':',
    coalesce(type, 'system'),
    coalesce(target_id::text, 'global'),
    md5(
      coalesce(message, '') ||
      coalesce(meta::text, '{}') ||
      coalesce(program_id::text, '')
    )
  )
)
where state_hash is null;

create index if not exists idx_notifications_dedupe
  on public.notifications(agency_id, type, target_id, state_hash);

-- ── 2. Performance Indexes ────────────────────────────────────
create index if not exists idx_users_agency       on public.users(agency_id);
create index if not exists idx_programs_agency    on public.programs(agency_id);
create index if not exists idx_clients_agency     on public.clients(agency_id);
create index if not exists idx_clients_program    on public.clients(program_id);
create index if not exists idx_clients_archived   on public.clients(agency_id, archived);
create index if not exists idx_payments_agency    on public.payments(agency_id);
create index if not exists idx_payments_client    on public.payments(client_id);
create index if not exists idx_invoices_agency_year on public.invoices(agency_id, invoice_year, invoice_number);
create index if not exists idx_invoices_agency_status on public.invoices(agency_id, status, issue_date desc);
create unique index if not exists idx_invoices_active_key
  on public.invoices(agency_id, invoice_key)
  where invoice_key is not null and status <> 'deleted';
create index if not exists idx_activity_agency           on public.activity_log(agency_id);
create index if not exists idx_activity_agency_created   on public.activity_log(agency_id, created_at desc);
create index if not exists idx_activity_archive_agency   on public.activity_log_archive(agency_id);
create index if not exists idx_activity_archive_created  on public.activity_log_archive(agency_id, created_at desc);
create index if not exists idx_notifications_agency on public.notifications(agency_id);
create index if not exists idx_notifications_state  on public.notifications(agency_id, is_archived, is_read);
create index if not exists idx_badge_templates_agency on public.badge_templates(agency_id, is_default, updated_at desc);

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
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.badge_templates enable row level security;
alter table public.activity_log enable row level security;
alter table public.activity_log_archive enable row level security;
alter table public.notifications enable row level security;

-- ── 5. RLS Policies ───────────────────────────────────────────

-- agencies: each user sees and edits only their own agency
drop policy if exists "agencies_select" on public.agencies;
drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_select" on public.agencies
  for select using (id = public.get_agency_id());
create policy "agencies_update" on public.agencies
  for update using (id = public.get_agency_id());

-- users: each user sees their own profile row and users in the same agency
drop policy if exists "users_select" on public.users;
drop policy if exists "users_update" on public.users;
create policy "users_select" on public.users
  for select using (
    id = auth.uid()
    or agency_id = public.get_agency_id()
  );
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

-- pilgrim badge photos: private bucket, agency-scoped object paths
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pilgrim-photos',
  'pilgrim-photos',
  false,
  3145728,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "pilgrim_photos_select" on storage.objects;
drop policy if exists "pilgrim_photos_insert" on storage.objects;
drop policy if exists "pilgrim_photos_update" on storage.objects;
drop policy if exists "pilgrim_photos_delete" on storage.objects;
create policy "pilgrim_photos_select" on storage.objects
  for select using (
    bucket_id = 'pilgrim-photos'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "pilgrim_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'pilgrim-photos'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "pilgrim_photos_update" on storage.objects
  for update using (
    bucket_id = 'pilgrim-photos'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  )
  with check (
    bucket_id = 'pilgrim-photos'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "pilgrim_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'pilgrim-photos'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );

-- badge template backgrounds: private bucket, agency-scoped object paths
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'badge-templates',
  'badge-templates',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "badge_templates_storage_select" on storage.objects;
drop policy if exists "badge_templates_storage_insert" on storage.objects;
drop policy if exists "badge_templates_storage_update" on storage.objects;
drop policy if exists "badge_templates_storage_delete" on storage.objects;
create policy "badge_templates_storage_select" on storage.objects
  for select using (
    bucket_id = 'badge-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "badge_templates_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'badge-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "badge_templates_storage_update" on storage.objects
  for update using (
    bucket_id = 'badge-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  )
  with check (
    bucket_id = 'badge-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "badge_templates_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'badge-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );

-- badge template rows
drop policy if exists "badge_templates_select" on public.badge_templates;
drop policy if exists "badge_templates_insert" on public.badge_templates;
drop policy if exists "badge_templates_update" on public.badge_templates;
drop policy if exists "badge_templates_delete" on public.badge_templates;
create policy "badge_templates_select" on public.badge_templates
  for select using (agency_id = public.get_agency_id());
create policy "badge_templates_insert" on public.badge_templates
  for insert with check (agency_id = public.get_agency_id());
create policy "badge_templates_update" on public.badge_templates
  for update using (agency_id = public.get_agency_id())
  with check (agency_id = public.get_agency_id());
create policy "badge_templates_delete" on public.badge_templates
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

-- invoices
drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_select" on public.invoices
  for select using (agency_id = public.get_agency_id());
create policy "invoices_insert" on public.invoices
  for insert with check (agency_id = public.get_agency_id());
create policy "invoices_update" on public.invoices
  for update using (agency_id = public.get_agency_id())
  with check (agency_id = public.get_agency_id());

-- counters are only changed by the issue_final_invoice RPC.
drop policy if exists "invoice_counters_select" on public.invoice_counters;
create policy "invoice_counters_select" on public.invoice_counters
  for select using (agency_id = public.get_agency_id());

create or replace function public.touch_invoice_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.touch_invoice_updated_at();

create or replace function public.issue_final_invoice(
  p_agency_id uuid,
  p_invoice_key text,
  p_client_id text,
  p_program_id text,
  p_issue_date date,
  p_recipient_type text,
  p_recipient_snapshot jsonb,
  p_program_snapshot jsonb,
  p_amount_snapshot jsonb,
  p_payment_references jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_invoice public.invoices;
  next_number integer;
  v_invoice_year integer;
  inserted_invoice public.invoices;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_recipient_type not in ('client','company') then
    raise exception 'invalid recipient type';
  end if;

  if p_invoice_key is not null and length(trim(p_invoice_key)) > 0 then
    select *
    into existing_invoice
    from public.invoices
    where agency_id = p_agency_id
      and invoice_key = p_invoice_key
      and status <> 'deleted'
    limit 1;
    if found then
      return existing_invoice;
    end if;
  end if;

  v_invoice_year := extract(year from coalesce(p_issue_date, current_date))::integer;

  insert into public.invoice_counters (agency_id, invoice_year, last_number)
  values (p_agency_id, v_invoice_year, 0)
  on conflict (agency_id, invoice_year) do nothing;

  select last_number + 1
  into next_number
  from public.invoice_counters
  where agency_id = p_agency_id
    and invoice_year = v_invoice_year
  for update;

  update public.invoice_counters
  set last_number = next_number,
      updated_at = now()
  where agency_id = p_agency_id
    and invoice_year = v_invoice_year;

  insert into public.invoices (
    agency_id,
    client_id,
    program_id,
    invoice_number,
    invoice_display_number,
    invoice_year,
    issue_date,
    status,
    recipient_type,
    recipient_snapshot,
    program_snapshot,
    amount_snapshot,
    payment_references,
    invoice_key,
    created_by
  )
  values (
    p_agency_id,
    nullif(p_client_id, ''),
    nullif(p_program_id, ''),
    next_number,
    lpad(next_number::text, 4, '0') || '/' || v_invoice_year::text,
    v_invoice_year,
    coalesce(p_issue_date, current_date),
    'issued',
    p_recipient_type,
    coalesce(p_recipient_snapshot, '{}'::jsonb),
    coalesce(p_program_snapshot, '{}'::jsonb),
    coalesce(p_amount_snapshot, '{}'::jsonb),
    coalesce(p_payment_references, '[]'::jsonb),
    nullif(p_invoice_key, ''),
    auth.uid()
  )
  returning * into inserted_invoice;

  return inserted_invoice;
end;
$$;

-- Activity logging for payments
drop function if exists public.log_payment_activity cascade;
create or replace function public.log_payment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
  amount_text text;
  desc_text   text;
begin
  if TG_OP = 'INSERT' then
    select name into client_name from public.clients where id = NEW.client_id;
    amount_text := trim(to_char(NEW.amount, 'FM999G999G990D00'));
    desc_text   := 'دفعة ' || amount_text || ' د.م — ' || coalesce(NEW.receipt_no, '');
    insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
    values (gen_random_uuid(), NEW.agency_id, auth.uid(), 'payment_add', desc_text, client_name, now());
    return NEW;
  elsif TG_OP = 'DELETE' then
    select name into client_name from public.clients where id = OLD.client_id;
    desc_text := 'تم حذف دفعة ' || coalesce(OLD.receipt_no, '');
    insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
    values (gen_random_uuid(), OLD.agency_id, auth.uid(), 'payment_delete', desc_text, client_name, now());
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_payments_activity on public.payments;
create trigger trg_payments_activity
after insert or delete on public.payments
for each row execute function public.log_payment_activity();

-- notifications
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (agency_id = public.get_agency_id());
create policy "notifications_insert" on public.notifications
  for insert with check (agency_id = public.get_agency_id());
create policy "notifications_update" on public.notifications
  for update using (agency_id = public.get_agency_id());
create policy "notifications_delete" on public.notifications
  for delete using (agency_id = public.get_agency_id());

-- activity_log
drop policy if exists "activity_select" on public.activity_log;
drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_select" on public.activity_log
  for select using (agency_id = public.get_agency_id());
create policy "activity_insert" on public.activity_log
  for insert with check (agency_id = public.get_agency_id());

-- activity_log_archive
drop policy if exists "activity_archive_select" on public.activity_log_archive;
drop policy if exists "activity_archive_insert" on public.activity_log_archive;
create policy "activity_archive_select" on public.activity_log_archive
  for select using (agency_id = public.get_agency_id());
create policy "activity_archive_insert" on public.activity_log_archive
  for insert with check (agency_id = public.get_agency_id());

-- Archive helper
create or replace function public.archive_activity_log(days_threshold integer default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  moved integer;
begin
  with expired as (
    delete from public.activity_log
    where agency_id = public.get_agency_id()
      and created_at < now() - make_interval(days => days_threshold)
    returning *
  ),
  inserted as (
    insert into public.activity_log_archive (id, agency_id, user_id, type, description, client_name, created_at, archived_at)
    select id, agency_id, user_id, type, description, client_name, created_at, now()
    from expired
    returning 1
  )
  select count(*) into moved from inserted;
  return coalesce(moved, 0);
end;
$$;

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
    insert into public.users (id, agency_id, email, role, full_name)
    values (
      new.id,
      (new.raw_user_meta_data->>'agency_id')::uuid,
      new.email,
      case
        when new.raw_user_meta_data->>'role' in ('owner','manager','staff')
          then new.raw_user_meta_data->>'role'
        else 'staff'
      end,
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
