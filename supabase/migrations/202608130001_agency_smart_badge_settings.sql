-- Phase 1: per-agency configuration for the code-generated Smart Badge.
-- This is intentionally independent from badge_templates and does not affect printing.
create table if not exists public.agency_smart_badge_settings (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  config jsonb not null default '{"content":{"photo":true,"passport":true,"program":true,"group":true,"room":true,"hotel":false,"city":false,"phone":false},"appearance":{"primaryColor":"#805b0b","density":"balanced"}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_smart_badge_settings_config_object check (jsonb_typeof(config) = 'object')
);

alter table public.agency_smart_badge_settings enable row level security;

create or replace function public.touch_agency_smart_badge_settings_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agency_smart_badge_settings_updated_at on public.agency_smart_badge_settings;
create trigger trg_agency_smart_badge_settings_updated_at
before update on public.agency_smart_badge_settings
for each row execute function public.touch_agency_smart_badge_settings_updated_at();

drop policy if exists "agency_smart_badge_settings_select" on public.agency_smart_badge_settings;
drop policy if exists "agency_smart_badge_settings_insert" on public.agency_smart_badge_settings;
drop policy if exists "agency_smart_badge_settings_update" on public.agency_smart_badge_settings;

create policy "agency_smart_badge_settings_select" on public.agency_smart_badge_settings
for select to authenticated using (agency_id = public.get_agency_id());

create policy "agency_smart_badge_settings_insert" on public.agency_smart_badge_settings
for insert to authenticated with check (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
);

create policy "agency_smart_badge_settings_update" on public.agency_smart_badge_settings
for update to authenticated
using (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
)
with check (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
);

grant select, insert, update on public.agency_smart_badge_settings to authenticated;
