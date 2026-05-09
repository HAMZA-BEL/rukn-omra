-- DB-09: Persist rooming designer assignments in Supabase.
-- Do not run automatically. Review, then apply manually.
--
-- Scope:
-- - Adds one JSON-backed rooming record per agency + program + location.
-- - Keeps Makkah and Madinah rooming isolated by the location column.
-- - Enables agency-scoped RLS using the existing get_agency_id() helper.
-- - Does not change clients, payments, invoices, rooming drag/drop, or exports.

create table if not exists public.rooming_assignments (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references public.agencies(id) on delete cascade,
  program_id     uuid not null references public.programs(id) on delete cascade,
  location       text not null check (location in ('makkah', 'madinah')),
  rooms          jsonb not null default '[]'::jsonb,
  unassigned     jsonb not null default '[]'::jsonb,
  meta           jsonb not null default '{}'::jsonb,
  canvas_version integer not null default 4,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null,
  unique (agency_id, program_id, location)
);

create index if not exists idx_rooming_assignments_agency_program_location
  on public.rooming_assignments (agency_id, program_id, location);

alter table public.rooming_assignments enable row level security;

create or replace function public.touch_rooming_assignments_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rooming_assignments_updated_at on public.rooming_assignments;
create trigger trg_rooming_assignments_updated_at
before insert or update on public.rooming_assignments
for each row execute function public.touch_rooming_assignments_updated_at();

drop policy if exists "rooming_assignments_select" on public.rooming_assignments;
drop policy if exists "rooming_assignments_insert" on public.rooming_assignments;
drop policy if exists "rooming_assignments_update" on public.rooming_assignments;

create policy "rooming_assignments_select" on public.rooming_assignments
  for select using (agency_id = public.get_agency_id());

create policy "rooming_assignments_insert" on public.rooming_assignments
  for insert with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = public.get_agency_id()
    )
  );

create policy "rooming_assignments_update" on public.rooming_assignments
  for update using (agency_id = public.get_agency_id())
  with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = public.get_agency_id()
    )
  );

-- No delete policy is added in this phase. Browser users can save/update
-- rooming, but cannot hard-delete rooming records directly.
