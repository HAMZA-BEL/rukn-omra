-- Phase 2: allow versioned, logical-mm element overrides inside the existing config.
alter table public.agency_smart_badge_settings
  drop constraint if exists agency_smart_badge_settings_schema_version_check;

alter table public.agency_smart_badge_settings
  alter column schema_version set default 2;

alter table public.agency_smart_badge_settings
  add constraint agency_smart_badge_settings_schema_version_check
  check (schema_version between 1 and 2);

update public.agency_smart_badge_settings
set schema_version = 2,
    config = case
      when config ? 'elements' then config
      else config || '{"elements":{}}'::jsonb
    end
where schema_version = 1;
