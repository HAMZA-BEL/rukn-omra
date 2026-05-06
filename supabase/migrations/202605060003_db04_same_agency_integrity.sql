-- DB-04: Enforce same-agency relationships between tenant-owned records.
-- Do not run automatically. Review diagnostics first, then apply manually.
--
-- ============================================================
-- 1) Diagnostics to run before applying this migration
-- ============================================================
--
-- Cross-agency clients -> programs:
-- select c.id, c.agency_id, c.program_id, p.agency_id as program_agency_id
-- from public.clients c
-- join public.programs p on p.id = c.program_id
-- where c.agency_id <> p.agency_id;
--
-- Cross-agency clients -> represented_by_client:
-- select c.id, c.agency_id, c.represented_by_client_id, r.agency_id as represented_agency_id
-- from public.clients c
-- join public.clients r on r.id = c.represented_by_client_id
-- where c.agency_id <> r.agency_id;
--
-- Cross-agency payments -> clients:
-- select p.id, p.agency_id, p.client_id, c.agency_id as client_agency_id
-- from public.payments p
-- join public.clients c on c.id = p.client_id
-- where p.agency_id <> c.agency_id;
--
-- Cross-agency notifications -> programs:
-- select n.id, n.agency_id, n.program_id, p.agency_id as program_agency_id
-- from public.notifications n
-- join public.programs p on p.id = n.program_id
-- where n.agency_id <> p.agency_id;
--
-- ============================================================
-- 2) Optional cleanup SQL, only if diagnostics return rows
-- ============================================================
--
-- Review affected rows before running any cleanup. These statements remove only
-- invalid cross-agency references while keeping the owning tenant row.
--
-- update public.clients c
-- set program_id = null
-- where program_id is not null
--   and not exists (
--     select 1 from public.programs p
--     where p.id = c.program_id
--       and p.agency_id = c.agency_id
--   );
--
-- update public.clients c
-- set represented_by_client_id = null
-- where represented_by_client_id is not null
--   and not exists (
--     select 1 from public.clients r
--     where r.id = c.represented_by_client_id
--       and r.agency_id = c.agency_id
--   );
--
-- update public.notifications n
-- set program_id = null
-- where program_id is not null
--   and not exists (
--     select 1 from public.programs p
--     where p.id = n.program_id
--       and p.agency_id = n.agency_id
--   );
--
-- Payments with cross-agency client links require manual review. Do not blindly
-- rewrite financial records. Decide whether to correct agency_id/client_id or
-- void/recreate the payment under the right tenant.

-- Required referenced keys for composite same-agency foreign keys.
create unique index if not exists programs_agency_id_id_uidx
  on public.programs (agency_id, id);

create unique index if not exists clients_agency_id_id_uidx
  on public.clients (agency_id, id);

-- clients.program_id must point to a program from the same agency.
-- ON DELETE is intentionally omitted: referenced tenant records should not be
-- hard-deleted while operational/history rows still point to them.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_program_same_agency_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_program_same_agency_fkey
      foreign key (agency_id, program_id)
      references public.programs (agency_id, id);
  end if;
end $$;

-- clients.represented_by_client_id must point to a client from the same agency.
-- ON DELETE is intentionally omitted for history integrity.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_represented_by_same_agency_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_represented_by_same_agency_fkey
      foreign key (agency_id, represented_by_client_id)
      references public.clients (agency_id, id);
  end if;
end $$;

-- payments.client_id must point to a client from the same agency.
-- ON DELETE is intentionally omitted; financial retention is handled later.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_client_same_agency_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_client_same_agency_fkey
      foreign key (agency_id, client_id)
      references public.clients (agency_id, id);
  end if;
end $$;

-- notifications.program_id must point to a program from the same agency.
-- ON DELETE is intentionally omitted for predictable tenant integrity.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_program_same_agency_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_program_same_agency_fkey
      foreign key (agency_id, program_id)
      references public.programs (agency_id, id);
  end if;
end $$;
