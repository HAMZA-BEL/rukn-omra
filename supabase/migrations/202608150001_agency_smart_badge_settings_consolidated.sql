-- Final consolidated Smart Badge persistence schema (application schema v9).
-- Safe for a fresh database and for databases that already have phase 1/2.

create table if not exists public.agency_smart_badge_settings (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  schema_version integer not null default 9,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agency_smart_badge_settings
  add column if not exists schema_version integer,
  add column if not exists config jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.agency_smart_badge_settings
  alter column schema_version set default 9,
  alter column config set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.agency_smart_badge_settings
set schema_version = coalesce(schema_version, 9),
    config = case when jsonb_typeof(config) = 'object' then config else '{}'::jsonb end,
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where schema_version is null
   or config is null
   or jsonb_typeof(config) is distinct from 'object'
   or created_at is null
   or updated_at is null;

alter table public.agency_smart_badge_settings
  alter column schema_version set not null,
  alter column config set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- Remove phase 1/2 limits before existing rows are promoted to v9.
alter table public.agency_smart_badge_settings
  drop constraint if exists agency_smart_badge_settings_schema_version_check;
alter table public.agency_smart_badge_settings
  drop constraint if exists agency_smart_badge_settings_config_object;

-- Add only missing v9 defaults. Existing valid and unknown keys are retained.
with defaults as (
  select
    '{"printSource":"legacy","content":{},"appearance":{},"elements":{},"layoutOverrides":{},"componentSources":{}}'::jsonb as root,
    '{"photo":true,"passport":true,"program":true,"group":true,"room":true,"hotel":false,"makkahHotel":true,"madinahHotel":true,"city":false,"phone":false,"guidePhone":false,"travelDate":true,"watermark":false}'::jsonb as content,
    '{"layoutFamily":"rukn-signature","stylePreset":"soft","template":"rukn-signature","compositionStyle":"rukn-signature","primaryColor":"#805b0b","density":"balanced","headerStyle":"classic","fieldsStyle":"cards","separatorsStyle":"soft","backgroundStyle":"warm","footerStyle":"classic","identityStyle":"classic","photoStyle":"portrait","decorativeStyle":"editorial","badgeBackground":"#fcfaf4","heroBackground":"#ffffff","heroContainerVisible":true,"heroFrameVisible":true,"heroBorderColor":"#ded6c7","heroBorderWidth":1,"heroRadius":18,"heroShadowVisible":true,"heroOpacity":100,"heroPadding":13,"accentColor":"#b8aa90","labelFontSize":9.5,"labelFontWeight":700,"labelColor":"#777f7a","valueFontSize":13,"valueFontWeight":800,"valueColor":"#19221f","fieldBackground":"#ffffff","fieldBorderColor":"#e4ddd0","fieldBorderWidth":1,"fieldRadius":9,"fieldPadding":7}'::jsonb as appearance,
    '{"header":"rukn-signature","hero":"rukn-signature","primaryData":"rukn-signature","secondaryData":"rukn-signature","fieldStyle":"rukn-signature","background":"rukn-signature","separators":"rukn-signature","footer":"rukn-signature","photoFrame":"rukn-signature"}'::jsonb as component_sources
), prepared as (
  select s.agency_id, d.root || s.config as base,
         d.content, d.appearance, d.component_sources
  from public.agency_smart_badge_settings s
  cross join defaults d
), normalized as (
  select agency_id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              base,
              '{content}',
              content || case when jsonb_typeof(base->'content') = 'object' then base->'content' else '{}'::jsonb end,
              true
            ),
            '{appearance}',
            appearance || case when jsonb_typeof(base->'appearance') = 'object' then base->'appearance' else '{}'::jsonb end,
            true
          ),
          '{elements}',
          case when jsonb_typeof(base->'elements') = 'object' then base->'elements' else '{}'::jsonb end,
          true
        ),
        '{layoutOverrides}',
        case when jsonb_typeof(base->'layoutOverrides') = 'object' then base->'layoutOverrides' else '{}'::jsonb end,
        true
      ),
      '{componentSources}',
      component_sources || case when jsonb_typeof(base->'componentSources') = 'object' then base->'componentSources' else '{}'::jsonb end,
      true
    ) as config
  from prepared
)
update public.agency_smart_badge_settings s
set config = n.config,
    schema_version = 9
from normalized n
where n.agency_id = s.agency_id;

alter table public.agency_smart_badge_settings
  add constraint agency_smart_badge_settings_schema_version_check
    check (schema_version between 1 and 9),
  add constraint agency_smart_badge_settings_config_object
    check (jsonb_typeof(config) = 'object');

create or replace function public.touch_agency_smart_badge_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_agency_smart_badge_settings_updated_at()
  from public, anon, authenticated;

drop trigger if exists trg_agency_smart_badge_settings_updated_at
  on public.agency_smart_badge_settings;
create trigger trg_agency_smart_badge_settings_updated_at
before update on public.agency_smart_badge_settings
for each row execute function public.touch_agency_smart_badge_settings_updated_at();

alter table public.agency_smart_badge_settings enable row level security;

drop policy if exists "agency_smart_badge_settings_select"
  on public.agency_smart_badge_settings;
drop policy if exists "agency_smart_badge_settings_insert"
  on public.agency_smart_badge_settings;
drop policy if exists "agency_smart_badge_settings_update"
  on public.agency_smart_badge_settings;

create policy "agency_smart_badge_settings_select"
on public.agency_smart_badge_settings
for select to authenticated
using (agency_id = public.get_agency_id());

create policy "agency_smart_badge_settings_insert"
on public.agency_smart_badge_settings
for insert to authenticated
with check (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
);

create policy "agency_smart_badge_settings_update"
on public.agency_smart_badge_settings
for update to authenticated
using (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
)
with check (
  agency_id = public.get_agency_id()
  and public.has_agency_role(array['owner','manager'])
);

revoke all on table public.agency_smart_badge_settings from anon;
revoke all on table public.agency_smart_badge_settings from authenticated;
grant select, insert, update on table public.agency_smart_badge_settings to authenticated;
