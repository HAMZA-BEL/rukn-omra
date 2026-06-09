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
  logo_path        text,
  created_at       timestamptz default now()
);

alter table public.agencies add column if not exists agency_city text;
alter table public.agencies add column if not exists logo_path text;
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
  hotel_checkin_day text not null default 'next_day' check (hotel_checkin_day in ('same_day', 'next_day')),
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
  address            text,
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
  represented_by_client_id uuid references public.clients(id) on delete set null,
  represented_by_relationship text,
  registration_date  date,
  last_modified      date,
  created_at         timestamptz default now()
);

alter table public.programs add column if not exists badge_guide_phone text;
alter table public.programs add column if not exists badge_saudi_phone_1 text;
alter table public.programs add column if not exists badge_saudi_phone_2 text;
alter table public.programs add column if not exists badge_note text;
alter table public.programs add column if not exists badge_template_id text;
alter table public.programs add column if not exists hotel_checkin_day text not null default 'next_day';
alter table public.programs alter column hotel_checkin_day set default 'next_day';
alter table public.programs alter column hotel_checkin_day set not null;
alter table public.programs drop constraint if exists programs_hotel_checkin_day_check;
alter table public.programs add constraint programs_hotel_checkin_day_check
  check (hotel_checkin_day in ('same_day', 'next_day'));
alter table public.clients add column if not exists registration_source text;
alter table public.clients add column if not exists represented_by_client_id uuid references public.clients(id) on delete set null;
alter table public.clients add column if not exists represented_by_relationship text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_represented_by_not_self'
  ) then
    alter table public.clients
      add constraint clients_represented_by_not_self
      check (represented_by_client_id is null or represented_by_client_id <> id);
  end if;
end $$;

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

-- Contract templates
create table if not exists public.contract_templates (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  template_type text not null check (template_type in ('umrah', 'hajj')),
  template_path text not null,
  file_name     text,
  file_size     integer,
  updated_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (agency_id, template_type)
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
  payment_type text not null default 'normal',
  legacy_receipt_number text,
  note        text,
  created_at  timestamptz default now()
);

alter table public.payments add column if not exists cheque_number text;
alter table public.payments add column if not exists paid_by text;
alter table public.payments add column if not exists receipt_sequence integer;
alter table public.payments add column if not exists payment_type text not null default 'normal';
alter table public.payments add column if not exists legacy_receipt_number text;
alter table public.payments add column if not exists status text default 'active';
alter table public.payments add column if not exists trashed_at timestamptz;
alter table public.payments add column if not exists deleted_at timestamptz;

alter table public.payments drop constraint if exists payments_payment_type_check;
alter table public.payments add constraint payments_payment_type_check
  check (payment_type in ('normal', 'previous'));

create unique index if not exists payments_agency_receipt_sequence_unique
  on public.payments (agency_id, receipt_sequence)
  where receipt_sequence is not null;
create index if not exists payments_agency_status_idx
  on public.payments (agency_id, status);
create index if not exists idx_payments_agency_payment_type
  on public.payments (agency_id, payment_type);
create index if not exists payments_agency_trashed_at_idx
  on public.payments (agency_id, trashed_at)
  where status = 'trashed';

create table if not exists public.receipt_counters (
  agency_id   uuid primary key references public.agencies(id) on delete cascade,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.receipt_counters (agency_id, last_number)
select parsed.agency_id, max(parsed.receipt_number)
from (
  select
    agency_id,
    substring(trim(receipt_no) from '([0-9]+)$')::integer as receipt_number
  from public.payments
  where receipt_no is not null
    and substring(trim(receipt_no) from '([0-9]+)$') is not null
) parsed
group by parsed.agency_id
on conflict (agency_id) do update
set last_number = greatest(public.receipt_counters.last_number, excluded.last_number),
    updated_at = now();

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

drop view if exists public.activity_log_all;
create view public.activity_log_all
with (security_invoker = true) as
  select id, agency_id, user_id, type, description, client_name, created_at, false as is_archived
  from public.activity_log
  where agency_id = public.get_agency_id();

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
create index if not exists idx_clients_represented_by on public.clients(agency_id, represented_by_client_id);
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
create index if not exists idx_notifications_agency on public.notifications(agency_id);
create index if not exists idx_notifications_state  on public.notifications(agency_id, is_archived, is_read);
create index if not exists idx_badge_templates_agency on public.badge_templates(agency_id, is_default, updated_at desc);
create index if not exists idx_contract_templates_agency on public.contract_templates(agency_id, template_type);

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
alter table public.receipt_counters enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.badge_templates enable row level security;
alter table public.contract_templates enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;

-- ── 5. RLS Policies ───────────────────────────────────────────

-- agencies: each user sees and edits only their own agency
drop policy if exists "agencies_select" on public.agencies;
drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_select" on public.agencies
  for select using (id = public.get_agency_id());
create policy "agencies_update" on public.agencies
  for update using (id = public.get_agency_id())
  with check (id = public.get_agency_id());

-- users: each user sees their own profile row and users in the same agency
drop policy if exists "users_select" on public.users;
drop policy if exists "users_update" on public.users;
create policy "users_select" on public.users
  for select using (
    id = auth.uid()
    or agency_id = public.get_agency_id()
  );

-- User management must go through trusted server-side functions that use the
-- service role. Normal authenticated clients must not update users directly,
-- because role/status/agency_id changes would be privilege-sensitive.
revoke update on public.users from authenticated;

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
  for update using (agency_id = public.get_agency_id())
  with check (agency_id = public.get_agency_id());
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
  for insert with check (
    agency_id = public.get_agency_id()
    and (
      program_id is null
      or exists (
        select 1
        from public.programs p
        where p.id = program_id
          and p.agency_id = public.get_agency_id()
      )
    )
  );
create policy "clients_update" on public.clients
  for update using (agency_id = public.get_agency_id())
  with check (
    agency_id = public.get_agency_id()
    and (
      program_id is null
      or exists (
        select 1
        from public.programs p
        where p.id = program_id
          and p.agency_id = public.get_agency_id()
      )
    )
  );
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

-- agency assets: private bucket, agency-scoped object paths for logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agency-assets',
  'agency-assets',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "agency_assets_select" on storage.objects;
drop policy if exists "agency_assets_insert" on storage.objects;
drop policy if exists "agency_assets_update" on storage.objects;
drop policy if exists "agency_assets_delete" on storage.objects;
create policy "agency_assets_select" on storage.objects
  for select using (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "agency_assets_insert" on storage.objects
  for insert with check (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "agency_assets_update" on storage.objects
  for update using (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  )
  with check (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "agency_assets_delete" on storage.objects
  for delete using (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );

-- contract template documents: private bucket, agency-scoped object paths
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-templates',
  'contract-templates',
  false,
  10485760,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

drop policy if exists "contract_templates_storage_select" on storage.objects;
drop policy if exists "contract_templates_storage_insert" on storage.objects;
drop policy if exists "contract_templates_storage_update" on storage.objects;
drop policy if exists "contract_templates_storage_delete" on storage.objects;
create policy "contract_templates_storage_select" on storage.objects
  for select using (
    bucket_id = 'contract-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );
create policy "contract_templates_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'contract-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  );
create policy "contract_templates_storage_update" on storage.objects
  for update using (
    bucket_id = 'contract-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  )
  with check (
    bucket_id = 'contract-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  );
create policy "contract_templates_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'contract-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
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

-- contract template rows
drop policy if exists "contract_templates_select" on public.contract_templates;
drop policy if exists "contract_templates_insert" on public.contract_templates;
drop policy if exists "contract_templates_update" on public.contract_templates;
drop policy if exists "contract_templates_delete" on public.contract_templates;
create policy "contract_templates_select" on public.contract_templates
  for select using (agency_id = public.get_agency_id());
create policy "contract_templates_insert" on public.contract_templates
  for insert with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  );
create policy "contract_templates_update" on public.contract_templates
  for update using (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  )
  with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  );
create policy "contract_templates_delete" on public.contract_templates
  for delete using (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.agency_id = public.get_agency_id()
        and lower(u.role) in ('manager', 'owner', 'admin')
    )
  );

-- payments
revoke insert, update, delete on table public.payments from public, anon, authenticated;

drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;
drop policy if exists "payments_insert_blocked" on public.payments;
drop policy if exists "payments_update_blocked" on public.payments;
drop policy if exists "payments_delete_blocked" on public.payments;
create policy "payments_select" on public.payments
  for select using (agency_id = public.get_agency_id());
create policy "payments_insert_blocked" on public.payments
  for insert with check (false);
create policy "payments_update_blocked" on public.payments
  for update using (false)
  with check (false);
create policy "payments_delete_blocked" on public.payments
  for delete using (false);

-- receipt counters are changed by create_payment_with_receipt.
drop policy if exists "receipt_counters_select" on public.receipt_counters;
create policy "receipt_counters_select" on public.receipt_counters
  for select using (agency_id = public.get_agency_id());

-- invoices
revoke insert on table public.invoices from public, anon, authenticated;

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_insert_blocked" on public.invoices;
create policy "invoices_select" on public.invoices
  for select using (agency_id = public.get_agency_id());
create policy "invoices_insert_blocked" on public.invoices
  for insert with check (false);
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

create or replace function public.prevent_invoice_numbering_update()
returns trigger
language plpgsql
as $$
begin
  if new.agency_id is distinct from old.agency_id
    or new.invoice_number is distinct from old.invoice_number
    or new.invoice_display_number is distinct from old.invoice_display_number
    or new.invoice_year is distinct from old.invoice_year
    or new.invoice_key is distinct from old.invoice_key
  then
    raise exception 'invoice numbering fields are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_invoice_numbering_update on public.invoices;
create trigger trg_prevent_invoice_numbering_update
before update on public.invoices
for each row execute function public.prevent_invoice_numbering_update();

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

revoke all on function public.issue_final_invoice(
  uuid,
  text,
  text,
  text,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from public, anon;

grant execute on function public.issue_final_invoice(
  uuid,
  text,
  text,
  text,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to authenticated;

create or replace function public.create_payment_with_receipt(
  p_agency_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_date date default null,
  p_method text default null,
  p_note text default null,
  p_cheque_number text default null,
  p_paid_by text default null,
  p_payment_id uuid default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  next_receipt_no text;
  inserted_payment public.payments;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_client_id is null then
    raise exception 'client is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.agency_id = p_agency_id
  ) then
    raise exception 'invalid client';
  end if;

  insert into public.receipt_counters (agency_id, last_number)
  values (p_agency_id, 0)
  on conflict (agency_id) do nothing;

  select last_number + 1
  into next_number
  from public.receipt_counters
  where agency_id = p_agency_id
  for update;

  update public.receipt_counters
  set last_number = next_number,
      updated_at = now()
  where agency_id = p_agency_id;

  next_receipt_no := 'REC-' || lpad(next_number::text, 3, '0');

  insert into public.payments (
    id,
    agency_id,
    client_id,
    amount,
    date,
    method,
    receipt_no,
    receipt_sequence,
    payment_type,
    note,
    cheque_number,
    paid_by
  )
  values (
    coalesce(p_payment_id, gen_random_uuid()),
    p_agency_id,
    p_client_id,
    p_amount,
    coalesce(p_date, current_date),
    nullif(trim(p_method), ''),
    next_receipt_no,
    next_number,
    'normal',
    nullif(trim(p_note), ''),
    nullif(trim(p_cheque_number), ''),
    nullif(trim(p_paid_by), '')
  )
  returning * into inserted_payment;

  return inserted_payment;
end;
$$;

revoke all on function public.create_payment_with_receipt(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_payment_with_receipt(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid
) to authenticated;

create or replace function public.create_previous_payment(
  p_agency_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_date date default null,
  p_method text default null,
  p_note text default null,
  p_cheque_number text default null,
  p_paid_by text default null,
  p_legacy_receipt_number text default null,
  p_payment_id uuid default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_payment public.payments;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_client_id is null then
    raise exception 'client is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.agency_id = p_agency_id
  ) then
    raise exception 'invalid client';
  end if;

  insert into public.payments (
    id,
    agency_id,
    client_id,
    amount,
    date,
    method,
    receipt_no,
    receipt_sequence,
    payment_type,
    legacy_receipt_number,
    note,
    cheque_number,
    paid_by
  )
  values (
    coalesce(p_payment_id, gen_random_uuid()),
    p_agency_id,
    p_client_id,
    p_amount,
    coalesce(p_date, current_date),
    nullif(trim(p_method), ''),
    null,
    null,
    'previous',
    nullif(trim(p_legacy_receipt_number), ''),
    nullif(trim(p_note), ''),
    nullif(trim(p_cheque_number), ''),
    nullif(trim(p_paid_by), '')
  )
  returning * into inserted_payment;

  return inserted_payment;
end;
$$;

revoke all on function public.create_previous_payment(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_previous_payment(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  uuid
) to authenticated;

create or replace function public.trash_payment(
  p_agency_id uuid,
  p_payment_id uuid
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_payment public.payments;
  client_name text;
  desc_text text;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_payment_id is null then
    raise exception 'payment is required';
  end if;

  update public.payments
  set status = 'trashed',
      trashed_at = now(),
      deleted_at = null
  where id = p_payment_id
    and agency_id = p_agency_id
    and coalesce(status, 'active') <> 'deleted'
  returning * into updated_payment;

  if updated_payment.id is null then
    raise exception 'payment not found';
  end if;

  select name into client_name
  from public.clients
  where id = updated_payment.client_id
    and agency_id = updated_payment.agency_id;

  desc_text := 'تم نقل دفعة ' || coalesce(updated_payment.receipt_no, '') || ' إلى سلة المحذوفات';
  insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
  values (gen_random_uuid(), updated_payment.agency_id, auth.uid(), 'payment_trash', desc_text, client_name, now());

  return updated_payment;
end;
$$;

create or replace function public.restore_payment(
  p_agency_id uuid,
  p_payment_id uuid
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_payment public.payments;
  client_name text;
  desc_text text;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_payment_id is null then
    raise exception 'payment is required';
  end if;

  update public.payments
  set status = 'active',
      trashed_at = null,
      deleted_at = null
  where id = p_payment_id
    and agency_id = p_agency_id
    and coalesce(status, 'active') = 'trashed'
  returning * into updated_payment;

  if updated_payment.id is null then
    raise exception 'payment not found';
  end if;

  select name into client_name
  from public.clients
  where id = updated_payment.client_id
    and agency_id = updated_payment.agency_id;

  desc_text := 'تم استرجاع دفعة ' || coalesce(updated_payment.receipt_no, '');
  insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
  values (gen_random_uuid(), updated_payment.agency_id, auth.uid(), 'payment_restore', desc_text, client_name, now());

  return updated_payment;
end;
$$;

create or replace function public.delete_trashed_payment(
  p_agency_id uuid,
  p_payment_id uuid
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_payment public.payments;
  client_name text;
  desc_text text;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_payment_id is null then
    raise exception 'payment is required';
  end if;

  update public.payments
  set status = 'deleted',
      deleted_at = now()
  where id = p_payment_id
    and agency_id = p_agency_id
    and coalesce(status, 'active') = 'trashed'
  returning * into updated_payment;

  if updated_payment.id is null then
    raise exception 'payment not found';
  end if;

  select name into client_name
  from public.clients
  where id = updated_payment.client_id
    and agency_id = updated_payment.agency_id;

  desc_text := 'تم حذف دفعة نهائيًا ' || coalesce(updated_payment.receipt_no, '');
  insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
  values (gen_random_uuid(), updated_payment.agency_id, auth.uid(), 'payment_delete', desc_text, client_name, now());

  return updated_payment;
end;
$$;

revoke all on function public.trash_payment(uuid, uuid) from public, anon;
revoke all on function public.restore_payment(uuid, uuid) from public, anon;
revoke all on function public.delete_trashed_payment(uuid, uuid) from public, anon;

grant execute on function public.trash_payment(uuid, uuid) to authenticated;
grant execute on function public.restore_payment(uuid, uuid) to authenticated;
grant execute on function public.delete_trashed_payment(uuid, uuid) to authenticated;

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
    select name into client_name
    from public.clients
    where id = NEW.client_id
      and agency_id = NEW.agency_id;

    amount_text := trim(to_char(NEW.amount, 'FM999G999G990D00'));
    desc_text   := 'دفعة ' || amount_text || ' د.م — ' || coalesce(NEW.receipt_no, '');
    insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
    values (gen_random_uuid(), NEW.agency_id, auth.uid(), 'payment_add', desc_text, client_name, now());
    return NEW;
  elsif TG_OP = 'DELETE' then
    select name into client_name
    from public.clients
    where id = OLD.client_id
      and agency_id = OLD.agency_id;

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
  for update using (agency_id = public.get_agency_id())
  with check (agency_id = public.get_agency_id());
create policy "notifications_delete" on public.notifications
  for delete using (agency_id = public.get_agency_id());

-- activity_log
drop policy if exists "activity_select" on public.activity_log;
drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_select" on public.activity_log
  for select using (agency_id = public.get_agency_id());
create policy "activity_insert" on public.activity_log
  for insert with check (agency_id = public.get_agency_id());

-- Activity log cleanup helper
create or replace function public.clear_activity_log(days_threshold integer default 0)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  current_agency_id uuid;
  safe_days integer;
begin
  current_agency_id := public.get_agency_id();

  if current_agency_id is null then
    return 0;
  end if;

  safe_days := greatest(coalesce(days_threshold, 0), 0);

  delete from public.activity_log
  where agency_id = current_agency_id
    and created_at < now() - make_interval(days => safe_days);

  get diagnostics deleted_count = row_count;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.clear_activity_log(integer) from public, anon;
grant execute on function public.clear_activity_log(integer) to authenticated;

-- ── 5. Shared receipt grouped payments ───────────────────────
-- Creates one payment_groups row and one linked payment row per
-- covered client through the create_shared_receipt RPC.
create unique index if not exists programs_agency_id_id_uidx
  on public.programs (agency_id, id);

create unique index if not exists clients_agency_id_id_uidx
  on public.clients (agency_id, id);

create table if not exists public.payment_groups (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  program_id uuid not null references public.programs(id),
  payer_client_id uuid null references public.clients(id) on delete set null,
  payer_name text not null,
  receipt_number text not null,
  payment_type text not null,
  payment_method text not null,
  cheque_number text null,
  paid_by text null,
  payment_date date not null,
  total_amount numeric not null,
  notes text null,
  covered_clients jsonb not null default '[]'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.payment_groups drop constraint if exists payment_groups_payment_type_check;
alter table public.payment_groups add constraint payment_groups_payment_type_check
  check (payment_type in ('normal', 'previous'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_groups_program_same_agency_fkey'
      and conrelid = 'public.payment_groups'::regclass
  ) then
    alter table public.payment_groups
      add constraint payment_groups_program_same_agency_fkey
      foreign key (agency_id, program_id)
      references public.programs (agency_id, id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_groups_payer_same_agency_fkey'
      and conrelid = 'public.payment_groups'::regclass
  ) then
    alter table public.payment_groups
      add constraint payment_groups_payer_same_agency_fkey
      foreign key (agency_id, payer_client_id)
      references public.clients (agency_id, id);
  end if;
end $$;

alter table public.payments
  add column if not exists group_payment_id uuid null references public.payment_groups(id) on delete set null;

create index if not exists payment_groups_agency_program_idx
  on public.payment_groups (agency_id, program_id);
create index if not exists payment_groups_receipt_number_idx
  on public.payment_groups (receipt_number);
create index if not exists payments_group_payment_id_idx
  on public.payments (group_payment_id);

create or replace function public.touch_payment_groups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_groups_updated_at on public.payment_groups;
create trigger trg_payment_groups_updated_at
before update on public.payment_groups
for each row execute function public.touch_payment_groups_updated_at();

revoke all on function public.touch_payment_groups_updated_at() from public, anon, authenticated;

alter table public.payment_groups enable row level security;

revoke all on table public.payment_groups from public, anon;
grant select, insert, update, delete on table public.payment_groups to authenticated;

drop policy if exists "payment_groups_select" on public.payment_groups;
drop policy if exists "payment_groups_insert" on public.payment_groups;
drop policy if exists "payment_groups_update" on public.payment_groups;
drop policy if exists "payment_groups_delete" on public.payment_groups;

create policy "payment_groups_select" on public.payment_groups
  for select using (agency_id = public.get_agency_id());

create policy "payment_groups_insert" on public.payment_groups
  for insert with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
    and (
      payer_client_id is null
      or exists (
        select 1
        from public.clients c
        where c.id = payer_client_id
          and c.agency_id = agency_id
          and c.program_id = program_id
      )
    )
  );

create policy "payment_groups_update" on public.payment_groups
  for update using (agency_id = public.get_agency_id())
  with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
    and (
      payer_client_id is null
      or exists (
        select 1
        from public.clients c
        where c.id = payer_client_id
          and c.agency_id = agency_id
          and c.program_id = program_id
      )
    )
  );

create policy "payment_groups_delete" on public.payment_groups
  for delete using (agency_id = public.get_agency_id());

create or replace function public.create_shared_receipt(
  p_agency_id uuid,
  p_program_id uuid,
  p_payer_client_id uuid default null,
  p_payer_name text default null,
  p_payment_type text default 'normal',
  p_payment_method text default null,
  p_receipt_number text default null,
  p_cheque_number text default null,
  p_paid_by text default null,
  p_payment_date date default null,
  p_total_amount numeric default null,
  p_notes text default null,
  p_covered_clients jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_type text := lower(trim(coalesce(p_payment_type, 'normal')));
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_method_search text := lower(coalesce(p_payment_method, ''));
  v_cheque_number text := nullif(trim(coalesce(p_cheque_number, '')), '');
  v_paid_by text := nullif(trim(coalesce(p_paid_by, '')), '');
  v_payer_name text := nullif(trim(coalesce(p_payer_name, '')), '');
  v_receipt_number text;
  v_client_count integer := 0;
  v_distinct_client_count integer := 0;
  v_allocated_sum numeric := 0;
  v_group public.payment_groups;
  v_payments jsonb := '[]'::jsonb;
  v_covered_clients jsonb := '[]'::jsonb;
  v_next_number integer;
  v_amount_text text;
  v_is_cheque boolean;
  v_requires_paid_by boolean;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_program_id is null then
    raise exception 'program is required';
  end if;
  if not exists (
    select 1 from public.programs p
    where p.id = p_program_id
      and p.agency_id = p_agency_id
  ) then
    raise exception 'invalid program';
  end if;
  if v_payment_type not in ('normal', 'previous') then
    raise exception 'invalid payment type';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if v_payment_method is null then
    raise exception 'payment method is required';
  end if;
  if p_covered_clients is null or jsonb_typeof(p_covered_clients) <> 'array' then
    raise exception 'covered clients must be an array';
  end if;

  v_is_cheque := v_method_search like '%شيك%'
    or v_method_search like '%chèque%'
    or v_method_search like '%cheque%'
    or v_method_search like '%check%';
  v_requires_paid_by := v_is_cheque
    or v_method_search like '%تحويل%'
    or v_method_search like '%virement%'
    or v_method_search like '%transfer%'
    or v_method_search like '%إيداع%'
    or v_method_search like '%ايداع%'
    or v_method_search like '%dépôt%'
    or v_method_search like '%depot%'
    or v_method_search like '%deposit%';

  if v_is_cheque and v_cheque_number is null then
    raise exception 'cheque number is required';
  end if;
  if v_requires_paid_by and v_paid_by is null then
    raise exception 'paid by is required';
  end if;
  if v_payment_type = 'previous' and nullif(trim(coalesce(p_receipt_number, '')), '') is null then
    raise exception 'receipt number is required';
  end if;

  if p_payer_client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = p_payer_client_id
      and c.agency_id = p_agency_id
      and c.program_id = p_program_id
  ) then
    raise exception 'invalid payer client';
  end if;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  )
  select
    count(*)::integer,
    count(distinct client_id)::integer,
    coalesce(sum(allocated_amount), 0)
  into v_client_count, v_distinct_client_count, v_allocated_sum
  from parsed;

  if v_client_count <= 0 then
    raise exception 'at least one covered client is required';
  end if;
  if v_distinct_client_count <> v_client_count then
    raise exception 'duplicate covered clients are not allowed';
  end if;
  if round(v_allocated_sum * 100) <> round(p_total_amount * 100) then
    raise exception 'allocated total must equal receipt total';
  end if;

  if exists (
    with parsed as (
      select
        nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
        coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
      from jsonb_array_elements(p_covered_clients) as item(value)
    )
    select 1
    from parsed pc
    left join public.clients c
      on c.id = pc.client_id
     and c.agency_id = p_agency_id
     and c.program_id = p_program_id
    where pc.client_id is null
       or pc.allocated_amount <= 0
       or c.id is null
  ) then
    raise exception 'invalid covered client allocation';
  end if;

  if v_payment_type = 'normal' then
    insert into public.receipt_counters (agency_id, last_number)
    values (p_agency_id, 0)
    on conflict (agency_id) do nothing;

    select last_number + 1
    into v_next_number
    from public.receipt_counters
    where agency_id = p_agency_id
    for update;

    update public.receipt_counters
    set last_number = v_next_number,
        updated_at = now()
    where agency_id = p_agency_id;

    v_receipt_number := 'REC-' || lpad(v_next_number::text, 3, '0');
  else
    v_receipt_number := nullif(trim(coalesce(p_receipt_number, '')), '');
  end if;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      nullif(trim(coalesce(item.value->>'client_name', item.value->>'clientName', item.value->>'name')), '') as client_name,
      nullif(trim(coalesce(item.value->>'phone')), '') as phone,
      nullif(trim(coalesce(item.value->>'passport')), '') as passport,
      coalesce(nullif(coalesce(item.value->>'total_price', item.value->>'totalPrice'), '')::numeric, 0) as total_price,
      coalesce(nullif(coalesce(item.value->>'paid_before', item.value->>'paidBefore'), '')::numeric, 0) as paid_before,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount,
      coalesce(nullif(coalesce(item.value->>'remaining_after', item.value->>'remainingAfter'), '')::numeric, 0) as remaining_after
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  ),
  normalized as (
    select
      parsed.ordinality,
      parsed.client_id,
      coalesce(parsed.client_name, c.name) as client_name,
      parsed.phone,
      parsed.passport,
      parsed.total_price,
      parsed.paid_before,
      parsed.allocated_amount,
      parsed.remaining_after
    from parsed
    join public.clients c
      on c.id = parsed.client_id
     and c.agency_id = p_agency_id
     and c.program_id = p_program_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'client_id', client_id,
    'client_name', client_name,
    'phone', phone,
    'passport', passport,
    'total_price', total_price,
    'paid_before', paid_before,
    'allocated_amount', allocated_amount,
    'remaining_after', remaining_after
  ) order by ordinality), '[]'::jsonb)
  into v_covered_clients
  from normalized;

  insert into public.payment_groups (
    agency_id,
    program_id,
    payer_client_id,
    payer_name,
    receipt_number,
    payment_type,
    payment_method,
    cheque_number,
    paid_by,
    payment_date,
    total_amount,
    notes,
    covered_clients,
    created_by
  )
  values (
    p_agency_id,
    p_program_id,
    p_payer_client_id,
    coalesce(v_payer_name, '—'),
    v_receipt_number,
    v_payment_type,
    v_payment_method,
    v_cheque_number,
    v_paid_by,
    coalesce(p_payment_date, current_date),
    p_total_amount,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_covered_clients,
    auth.uid()
  )
  returning * into v_group;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  ),
  inserted as (
    insert into public.payments (
      id,
      agency_id,
      client_id,
      amount,
      date,
      method,
      receipt_no,
      receipt_sequence,
      payment_type,
      legacy_receipt_number,
      note,
      cheque_number,
      paid_by,
      group_payment_id
    )
    select
      gen_random_uuid(),
      p_agency_id,
      parsed.client_id,
      parsed.allocated_amount,
      coalesce(p_payment_date, current_date),
      v_payment_method,
      v_receipt_number,
      null,
      v_payment_type,
      case when v_payment_type = 'previous' then v_receipt_number else null end,
      nullif(trim(coalesce(p_notes, '')), ''),
      v_cheque_number,
      v_paid_by,
      v_group.id
    from parsed
    order by parsed.ordinality
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted) order by inserted.created_at), '[]'::jsonb)
  into v_payments
  from inserted;

  v_amount_text := trim(to_char(p_total_amount, 'FM999G999G990D00'));
  insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
  values (
    gen_random_uuid(),
    p_agency_id,
    auth.uid(),
    'shared_receipt_create',
    'تم إنشاء وصل مشترك بقيمة ' || v_amount_text || ' د.م عن ' || v_client_count::text || ' معتمرين — الدافع: ' || coalesce(v_payer_name, '—'),
    coalesce(v_payer_name, null),
    now()
  );

  return jsonb_build_object(
    'payment_group', to_jsonb(v_group),
    'payments', v_payments,
    'receipt_number', v_receipt_number
  );
end;
$$;

revoke all on function public.create_shared_receipt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_shared_receipt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  text,
  jsonb
) to authenticated;

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

-- This trigger function must not be directly callable by browser clients.
-- The auth.users trigger can still execute it as the function owner.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

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

-- Agency creation is an administrative operation. Do not expose it as a
-- directly callable RPC to public, anonymous, or authenticated browser users.
revoke all on function public.create_new_agency(text, text) from public, anon, authenticated;

-- ── Done ──────────────────────────────────────────────────────
-- Summary of steps after running this SQL:
-- 1. Run: select create_new_agency('اسم الوكالة', 'Agency Name');
--    → Copy the returned UUID
-- 2. In Supabase Dashboard → Authentication → Users → Invite user
--    Set user metadata: { "agency_id": "<uuid>", "role": "owner" }
-- 3. User receives email, sets password, and can log in.
-- ─────────────────────────────────────────────────────────────
