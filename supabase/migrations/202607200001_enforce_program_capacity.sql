-- Enforce program capacity at the database boundary.
-- Apply manually after reviewing the diagnostic query below.
-- This migration does not delete or rewrite existing data.
--
-- Diagnostic query (must return no rows before applying):
-- select
--   p.agency_id,
--   p.id as program_id,
--   p.name,
--   p.seats,
--   count(c.id)::integer as registered_count
-- from public.programs p
-- join public.clients c
--   on c.agency_id = p.agency_id
--  and c.program_id = p.id
--  and coalesce(c.deleted, false) = false
--  and c.deleted_at is null
--  and coalesce(c.archived, false) = false
--  and c.archived_at is null
-- where p.seats > 0
-- group by p.agency_id, p.id, p.name, p.seats
-- having count(c.id) > p.seats
-- order by count(c.id) - p.seats desc, p.id;

-- Abort before installing a guard when current data already exceeds capacity.
do $$
declare
  v_over_capacity record;
begin
  select
    p.agency_id,
    p.id as program_id,
    p.seats,
    count(c.id)::integer as registered_count
  into v_over_capacity
  from public.programs p
  join public.clients c
    on c.agency_id = p.agency_id
   and c.program_id = p.id
   and coalesce(c.deleted, false) = false
   and c.deleted_at is null
   and coalesce(c.archived, false) = false
   and c.archived_at is null
  where p.seats > 0
  group by p.agency_id, p.id, p.seats
  having count(c.id) > p.seats
  order by count(c.id) - p.seats desc, p.id
  limit 1;

  if found then
    raise exception 'PROGRAM_CAPACITY_PREFLIGHT_FAILED'
      using
        errcode = 'P0001',
        detail = format(
          'program_id=%s seats=%s registered_count=%s',
          v_over_capacity.program_id,
          v_over_capacity.seats,
          v_over_capacity.registered_count
        ),
        hint = 'Run the diagnostic query at the top of 202607200001_enforce_program_capacity.sql and resolve the existing over-capacity data before retrying.';
  end if;
end;
$$;

create or replace function public.guard_client_program_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_capacity integer;
  v_registered_count integer;
  v_old_consumes_seat boolean := false;
  v_new_consumes_seat boolean;
begin
  if tg_op = 'UPDATE' then
    v_old_consumes_seat := old.program_id is not null
      and coalesce(old.deleted, false) = false
      and old.deleted_at is null
      and coalesce(old.archived, false) = false
      and old.archived_at is null;
  end if;

  v_new_consumes_seat := new.program_id is not null
    and coalesce(new.deleted, false) = false
    and new.deleted_at is null
    and coalesce(new.archived, false) = false
    and new.archived_at is null;

  -- Ordinary edits and operations that release a seat must remain possible.
  if not v_new_consumes_seat then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and v_old_consumes_seat
    and old.agency_id is not distinct from new.agency_id
    and old.program_id is not distinct from new.program_id
  then
    return new;
  end if;

  -- Serialize every operation that starts consuming a seat in this program.
  select p.seats
  into v_capacity
  from public.programs p
  where p.id = new.program_id
    and p.agency_id = new.agency_id
  for update;

  if not found then
    raise exception 'PROGRAM_AGENCY_MISMATCH'
      using errcode = '23503';
  end if;

  -- Preserve the current application meaning: non-positive capacity is unlimited.
  -- NULL is theoretical because programs.seats is currently NOT NULL.
  if v_capacity is null or v_capacity <= 0 then
    return new;
  end if;

  -- Excluding NEW.id keeps INSERT ... ON CONFLICT DO UPDATE safe for existing clients.
  select count(*)::integer
  into v_registered_count
  from public.clients c
  where c.agency_id = new.agency_id
    and c.program_id = new.program_id
    and c.id <> new.id
    and coalesce(c.deleted, false) = false
    and c.deleted_at is null
    and coalesce(c.archived, false) = false
    and c.archived_at is null;

  if v_registered_count >= v_capacity then
    raise exception 'PROGRAM_CAPACITY_REACHED'
      using
        errcode = 'P0001',
        detail = format(
          'program_id=%s capacity=%s registered_count=%s',
          new.program_id,
          v_capacity,
          v_registered_count
        );
  end if;

  return new;
end;
$$;

create or replace function public.guard_program_capacity_reduction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_registered_count integer;
begin
  -- Full-row program upserts include seats even when it did not change.
  if new.seats is not distinct from old.seats then
    return new;
  end if;

  if new.seats is null or new.seats <= 0 then
    return new;
  end if;

  select count(*)::integer
  into v_registered_count
  from public.clients c
  where c.agency_id = new.agency_id
    and c.program_id = new.id
    and coalesce(c.deleted, false) = false
    and c.deleted_at is null
    and coalesce(c.archived, false) = false
    and c.archived_at is null;

  if v_registered_count > new.seats then
    raise exception 'PROGRAM_CAPACITY_BELOW_REGISTRATION'
      using
        errcode = 'P0001',
        detail = format(
          'program_id=%s requested_capacity=%s registered_count=%s',
          new.id,
          new.seats,
          v_registered_count
        );
  end if;

  return new;
end;
$$;

drop trigger if exists clients_program_capacity_guard on public.clients;
create trigger clients_program_capacity_guard
before insert or update of agency_id, program_id, deleted, deleted_at, archived, archived_at
on public.clients
for each row
execute function public.guard_client_program_capacity();

drop trigger if exists programs_capacity_reduction_guard on public.programs;
create trigger programs_capacity_reduction_guard
before update of seats
on public.programs
for each row
execute function public.guard_program_capacity_reduction();

revoke all on function public.guard_client_program_capacity() from public, anon, authenticated;
revoke all on function public.guard_program_capacity_reduction() from public, anon, authenticated;
