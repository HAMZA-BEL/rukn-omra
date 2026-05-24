-- DB-25: Default program poster template setting per agency.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Stores the agency's preferred poster template for future downloads.
-- - Keeps the setting on the agency row so existing agency settings writes persist it.
-- - Validates code/uploaded choices against templates available to the same agency.

alter table public.agencies
  add column if not exists default_poster_template_type text not null default 'official',
  add column if not exists default_poster_template_key text default 'rukn',
  add column if not exists default_poster_template_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agencies_default_poster_template_type_check'
      and conrelid = 'public.agencies'::regclass
  ) then
    alter table public.agencies
      add constraint agencies_default_poster_template_type_check
      check (default_poster_template_type in ('official', 'code', 'uploaded'));
  end if;
end
$$;

create or replace function public.validate_agency_default_poster_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.default_poster_template_type := coalesce(nullif(trim(new.default_poster_template_type), ''), 'official');

  if new.default_poster_template_type = 'official' then
    new.default_poster_template_key := 'rukn';
    new.default_poster_template_id := null;
    return new;
  end if;

  if new.default_poster_template_type = 'code' then
    new.default_poster_template_key := nullif(trim(new.default_poster_template_key), '');
    new.default_poster_template_id := null;

    if new.default_poster_template_key is null then
      raise exception 'Default poster code template key is required';
    end if;

    if not exists (
      select 1
      from public.agency_code_poster_templates t
      where t.agency_id = new.id
        and t.template_key = new.default_poster_template_key
        and t.enabled = true
    ) then
      raise exception 'Default poster code template is not assigned to this agency';
    end if;

    return new;
  end if;

  if new.default_poster_template_type = 'uploaded' then
    new.default_poster_template_key := null;

    if new.default_poster_template_id is null then
      raise exception 'Default uploaded poster template id is required';
    end if;

    if not exists (
      select 1
      from public.program_poster_templates t
      where t.agency_id = new.id
        and t.id = new.default_poster_template_id
    ) then
      raise exception 'Default uploaded poster template does not belong to this agency';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_agency_default_poster_template on public.agencies;
drop trigger if exists trg_validate_agency_default_poster_template_insert on public.agencies;
drop trigger if exists trg_validate_agency_default_poster_template_update on public.agencies;

create trigger trg_validate_agency_default_poster_template_insert
before insert
on public.agencies
for each row execute function public.validate_agency_default_poster_template();

create trigger trg_validate_agency_default_poster_template_update
before update of default_poster_template_type, default_poster_template_key, default_poster_template_id
on public.agencies
for each row execute function public.validate_agency_default_poster_template();
