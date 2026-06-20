-- Phase 1: Hajj program travel groups / flight groups.
-- Review and apply manually. This only adds managed sub-items under programs;
-- it does not assign clients to groups or change exports/contracts/badges/rooming.

create unique index if not exists programs_agency_id_id_uidx
  on public.programs (agency_id, id);

create table if not exists public.program_travel_groups (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  code text null,
  airline text null,
  departure_city text null,
  arrival_city text null,
  return_departure_city text null,
  return_arrival_city text null,
  departure_date date null,
  return_date date null,
  visit_order text null,
  hotel_check_in text null,
  route text null,
  flight_numbers text null,
  seat_capacity integer null,
  notes text null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_travel_groups_seat_capacity_check
    check (seat_capacity is null or seat_capacity > 0),
  constraint program_travel_groups_visit_order_check
    check (visit_order is null or visit_order in ('madinah_first', 'makkah_first')),
  constraint program_travel_groups_hotel_check_in_check
    check (hotel_check_in is null or hotel_check_in in ('same_day', 'next_day')),
  constraint program_travel_groups_dates_check
    check (departure_date is null or return_date is null or return_date >= departure_date)
);

alter table public.program_travel_groups
  add column if not exists visit_order text null,
  add column if not exists hotel_check_in text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_travel_groups_program_same_agency_fkey'
      and conrelid = 'public.program_travel_groups'::regclass
  ) then
    alter table public.program_travel_groups
      add constraint program_travel_groups_program_same_agency_fkey
      foreign key (agency_id, program_id)
      references public.programs (agency_id, id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists program_travel_groups_unique_name_per_program
  on public.program_travel_groups (agency_id, program_id, lower(trim(name)));

create index if not exists idx_program_travel_groups_agency_id
  on public.program_travel_groups (agency_id);

create index if not exists idx_program_travel_groups_program_id
  on public.program_travel_groups (program_id);

create index if not exists idx_program_travel_groups_agency_program
  on public.program_travel_groups (agency_id, program_id);

create index if not exists idx_program_travel_groups_agency_program_sort
  on public.program_travel_groups (agency_id, program_id, sort_order);

create or replace function public.touch_program_travel_groups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_program_travel_groups_updated_at on public.program_travel_groups;
create trigger trg_program_travel_groups_updated_at
before update on public.program_travel_groups
for each row execute function public.touch_program_travel_groups_updated_at();

revoke all on function public.touch_program_travel_groups_updated_at() from public, anon, authenticated;

alter table public.program_travel_groups enable row level security;

revoke all on table public.program_travel_groups from public, anon;
grant select, insert, update, delete on table public.program_travel_groups to authenticated;

drop policy if exists "program_travel_groups_select" on public.program_travel_groups;
drop policy if exists "program_travel_groups_insert" on public.program_travel_groups;
drop policy if exists "program_travel_groups_update" on public.program_travel_groups;
drop policy if exists "program_travel_groups_delete" on public.program_travel_groups;

create policy "program_travel_groups_select" on public.program_travel_groups
  for select using (agency_id = public.get_agency_id());

create policy "program_travel_groups_insert" on public.program_travel_groups
  for insert with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
  );

create policy "program_travel_groups_update" on public.program_travel_groups
  for update using (agency_id = public.get_agency_id())
  with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
  );

create policy "program_travel_groups_delete" on public.program_travel_groups
  for delete using (agency_id = public.get_agency_id());
