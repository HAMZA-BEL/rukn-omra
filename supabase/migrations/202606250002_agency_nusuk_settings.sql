-- Persist agency-level default contact settings for the Rukn Nusuk Assistant.
--
-- Security-sensitive:
-- - The frontend must not provide an agency_id for writes.
-- - The save RPC resolves the agency from the authenticated Rukn user/session.
-- - RLS keeps direct table access scoped to the caller's own agency.

create table if not exists public.agency_nusuk_settings (
  id                 uuid primary key default gen_random_uuid(),
  agency_id          uuid not null default public.get_agency_id() references public.agencies(id) on delete cascade,
  contact_email      text not null,
  phone_country_code text not null,
  phone_number       text not null,
  postal_code        text not null,
  created_by         uuid references auth.users(id) on delete set null,
  updated_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint agency_nusuk_settings_agency_unique unique (agency_id),
  constraint agency_nusuk_settings_contact_email_check check (
    contact_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  constraint agency_nusuk_settings_phone_country_code_check check (
    phone_country_code ~ '^\+[0-9]{1,4}$'
  ),
  constraint agency_nusuk_settings_required_fields_check check (
    length(trim(contact_email)) > 0
    and length(trim(phone_country_code)) > 0
    and length(trim(phone_number)) > 0
    and length(trim(postal_code)) > 0
  )
);

create index if not exists idx_agency_nusuk_settings_agency_id
  on public.agency_nusuk_settings (agency_id);

alter table public.agency_nusuk_settings enable row level security;

create or replace function public.touch_agency_nusuk_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.agency_id is null then
    new.agency_id := public.get_agency_id();
  end if;
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    if tg_op = 'INSERT' and new.created_by is null then
      new.created_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agency_nusuk_settings_updated_at on public.agency_nusuk_settings;
create trigger trg_agency_nusuk_settings_updated_at
before insert or update on public.agency_nusuk_settings
for each row execute function public.touch_agency_nusuk_settings_updated_at();

drop policy if exists "agency_nusuk_settings_select" on public.agency_nusuk_settings;
drop policy if exists "agency_nusuk_settings_insert" on public.agency_nusuk_settings;
drop policy if exists "agency_nusuk_settings_update" on public.agency_nusuk_settings;

create policy "agency_nusuk_settings_select" on public.agency_nusuk_settings
  for select using (agency_id = public.get_agency_id());

create policy "agency_nusuk_settings_insert" on public.agency_nusuk_settings
  for insert with check (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );

create policy "agency_nusuk_settings_update" on public.agency_nusuk_settings
  for update using (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  )
  with check (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );

grant select, insert, update on public.agency_nusuk_settings to authenticated;

create or replace function public.upsert_agency_nusuk_settings(
  p_contact_email text,
  p_phone_country_code text,
  p_phone_number text,
  p_postal_code text
)
returns public.agency_nusuk_settings
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_agency_id uuid;
  normalized_email text;
  normalized_country_code text;
  normalized_phone_number text;
  normalized_postal_code text;
  saved_settings public.agency_nusuk_settings;
begin
  current_agency_id := public.get_agency_id();
  if current_agency_id is null then
    raise exception 'invalid_agency' using errcode = '42501';
  end if;

  if not public.has_agency_role(array['owner','manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  normalized_email := lower(trim(coalesce(p_contact_email, '')));
  normalized_country_code := trim(coalesce(p_phone_country_code, ''));
  normalized_phone_number := trim(coalesce(p_phone_number, ''));
  normalized_postal_code := trim(coalesce(p_postal_code, ''));

  if normalized_email = ''
    or normalized_country_code = ''
    or normalized_phone_number = ''
    or normalized_postal_code = '' then
    raise exception 'missing_required_nusuk_settings' using errcode = '22023';
  end if;

  if normalized_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_contact_email' using errcode = '22023';
  end if;

  if normalized_country_code !~ '^\+[0-9]{1,4}$' then
    raise exception 'invalid_phone_country_code' using errcode = '22023';
  end if;

  insert into public.agency_nusuk_settings (
    agency_id,
    contact_email,
    phone_country_code,
    phone_number,
    postal_code,
    created_by,
    updated_by
  )
  values (
    current_agency_id,
    normalized_email,
    normalized_country_code,
    normalized_phone_number,
    normalized_postal_code,
    auth.uid(),
    auth.uid()
  )
  on conflict (agency_id) do update
  set contact_email = excluded.contact_email,
      phone_country_code = excluded.phone_country_code,
      phone_number = excluded.phone_number,
      postal_code = excluded.postal_code,
      updated_by = auth.uid(),
      updated_at = now()
  returning * into saved_settings;

  return saved_settings;
end;
$$;

revoke all on function public.upsert_agency_nusuk_settings(text, text, text, text) from public, anon;
grant execute on function public.upsert_agency_nusuk_settings(text, text, text, text) to authenticated;
