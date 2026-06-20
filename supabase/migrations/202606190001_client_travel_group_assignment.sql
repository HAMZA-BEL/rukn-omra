-- Phase 2.1: Optional Hajj travel-group assignment for clients.
-- A null travel_group_id means the client belongs to the main/base program.
-- Apply after 202606150001_program_travel_groups.sql.

alter table public.clients
  add column if not exists travel_group_id uuid null;

-- Required referenced key for the composite same-agency, same-program FK.
create unique index if not exists program_travel_groups_agency_program_id_uidx
  on public.program_travel_groups (agency_id, program_id, id);

-- MATCH SIMPLE allows the normal null travel_group_id case. This check ensures
-- a non-null assignment cannot bypass the composite FK through a null owner key.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_travel_group_requires_program_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_travel_group_requires_program_check
      check (
        travel_group_id is null
        or (agency_id is not null and program_id is not null)
      );
  end if;
end $$;

-- Assigned travel groups must belong to the same agency and main program as
-- the client. RESTRICT prevents deleting a group while clients reference it.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_travel_group_same_program_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_travel_group_same_program_fkey
      foreign key (agency_id, program_id, travel_group_id)
      references public.program_travel_groups (agency_id, program_id, id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_clients_agency_program_travel_group
  on public.clients (agency_id, program_id, travel_group_id);
