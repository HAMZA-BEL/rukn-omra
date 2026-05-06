-- DB-06: Prevent client hard-deletion from cascading into financial payments.
-- Do not run automatically. Review diagnostics first, then apply manually.
--
-- Business rule:
-- Payments are financial records. Deleting a client must never automatically
-- delete payments. Normal app deletion should remain soft-delete/trash.
--
-- ============================================================
-- 1) Diagnostics to run before applying this migration
-- ============================================================
--
-- Current payments -> clients foreign keys and delete actions:
-- select
--   c.conname,
--   pg_get_constraintdef(c.oid) as definition,
--   case c.confdeltype
--     when 'a' then 'NO ACTION'
--     when 'r' then 'RESTRICT'
--     when 'c' then 'CASCADE'
--     when 'n' then 'SET NULL'
--     when 'd' then 'SET DEFAULT'
--     else c.confdeltype::text
--   end as on_delete
-- from pg_constraint c
-- where c.contype = 'f'
--   and c.conrelid = 'public.payments'::regclass
--   and c.confrelid = 'public.clients'::regclass
-- order by c.conname;
--
-- Clients that currently have payments and therefore must not be hard-deleted:
-- select
--   c.agency_id,
--   c.id as client_id,
--   c.name as client_name,
--   count(p.id) as payment_count,
--   coalesce(sum(p.amount), 0) as payment_total
-- from public.clients c
-- join public.payments p
--   on p.client_id = c.id
-- group by c.agency_id, c.id, c.name
-- order by payment_count desc, payment_total desc;
--
-- Orphan payment check. This should return zero rows before/after applying:
-- select p.id, p.agency_id, p.client_id
-- from public.payments p
-- left join public.clients c on c.id = p.client_id
-- where c.id is null;
--
-- ============================================================
-- 2) Replace dangerous simple client_id cascade FK with RESTRICT
-- ============================================================

do $$
declare
  v_payment_client_attnum smallint;
  v_client_id_attnum smallint;
  v_constraint record;
begin
  select attnum::smallint into v_payment_client_attnum
  from pg_attribute
  where attrelid = 'public.payments'::regclass
    and attname = 'client_id'
    and not attisdropped;

  select attnum::smallint into v_client_id_attnum
  from pg_attribute
  where attrelid = 'public.clients'::regclass
    and attname = 'id'
    and not attisdropped;

  if v_payment_client_attnum is null or v_client_id_attnum is null then
    raise exception 'payments.client_id or clients.id column not found';
  end if;

  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.conrelid = 'public.payments'::regclass
      and c.confrelid = 'public.clients'::regclass
      and c.conkey = array[v_payment_client_attnum]::smallint[]
      and c.confkey = array[v_client_id_attnum]::smallint[]
      and c.confdeltype = 'c'
  loop
    execute format('alter table public.payments drop constraint %I', v_constraint.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.contype = 'f'
      and c.conrelid = 'public.payments'::regclass
      and c.confrelid = 'public.clients'::regclass
      and c.conkey = array[v_payment_client_attnum]::smallint[]
      and c.confkey = array[v_client_id_attnum]::smallint[]
  ) then
    alter table public.payments
      add constraint payments_client_id_fkey
      foreign key (client_id)
      references public.clients (id)
      on delete restrict;
  end if;
end $$;

-- ============================================================
-- 3) If Batch 4 same-agency FK exists, ensure it is not cascading
-- ============================================================

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payments_client_same_agency_fkey'
      and conrelid = 'public.payments'::regclass
      and confrelid = 'public.clients'::regclass
      and confdeltype = 'c'
  ) then
    alter table public.payments
      drop constraint payments_client_same_agency_fkey;

    alter table public.payments
      add constraint payments_client_same_agency_fkey
      foreign key (agency_id, client_id)
      references public.clients (agency_id, id)
      on delete restrict;
  end if;
end $$;
