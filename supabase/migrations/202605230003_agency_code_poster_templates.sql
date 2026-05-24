-- DB-24: Agency assignments for code-generated poster templates.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Assigns registered code-generated poster template keys to specific agencies.
-- - The official Rukn poster remains available to every agency without a row here.
-- - Private/signature templates will be assigned manually/admin-side in later phases.
-- - Normal agency users can read only their own assignments and cannot write rows.

create table if not exists public.agency_code_poster_templates (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  template_key text not null,
  enabled      boolean not null default true,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_code_poster_templates_agency_template_key_unique'
      and conrelid = 'public.agency_code_poster_templates'::regclass
  ) then
    alter table public.agency_code_poster_templates
      add constraint agency_code_poster_templates_agency_template_key_unique
      unique (agency_id, template_key);
  end if;
end
$$;

create index if not exists idx_agency_code_poster_templates_agency_id
  on public.agency_code_poster_templates (agency_id);

create index if not exists idx_agency_code_poster_templates_template_key
  on public.agency_code_poster_templates (template_key);

create index if not exists idx_agency_code_poster_templates_agency_enabled
  on public.agency_code_poster_templates (agency_id, enabled);

create index if not exists idx_agency_code_poster_templates_agency_template_key
  on public.agency_code_poster_templates (agency_id, template_key);

create or replace function public.touch_agency_code_poster_templates_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agency_code_poster_templates_updated_at on public.agency_code_poster_templates;
create trigger trg_agency_code_poster_templates_updated_at
before update on public.agency_code_poster_templates
for each row execute function public.touch_agency_code_poster_templates_updated_at();

alter table public.agency_code_poster_templates enable row level security;

drop policy if exists "agency_code_poster_templates_select" on public.agency_code_poster_templates;

create policy "agency_code_poster_templates_select" on public.agency_code_poster_templates
  for select using (agency_id = public.get_agency_id());
