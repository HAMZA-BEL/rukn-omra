-- Run only against an isolated test database after applying
-- 202607200001_enforce_program_capacity.sql.
-- Every fixture is rolled back at the end.

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end;
$$;

insert into public.agencies (id, name_ar)
values
  ('ca000000-0000-4000-8000-000000000001', 'capacity-test-a'),
  ('ca000000-0000-4000-8000-000000000002', 'capacity-test-b');

insert into public.programs (id, agency_id, name, seats)
values
  ('cb000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'two-seats', 2),
  ('cb000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000001', 'full-target', 1),
  ('cb000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'available-target', 2),
  ('cb000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000001', 'unlimited', 0),
  ('cb000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000002', 'other-agency', 1);

-- 1-2: below capacity and the final available seat both succeed.
insert into public.clients (id, agency_id, program_id, name)
values
  ('cc000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001', 'seat-1'),
  ('cc000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001', 'seat-2');

select pg_temp.assert_true(
  (select count(*) from public.clients where program_id = 'cb000000-0000-4000-8000-000000000001') = 2,
  'the last available seat must be accepted'
);

-- 3 and 13: a direct insert beyond capacity fails with the stable marker.
do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into public.clients (id, agency_id, program_id, name)
    values ('cc000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001', 'blocked');
  exception when others then
    if sqlerrm <> 'PROGRAM_CAPACITY_REACHED' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then raise exception 'over-capacity direct insert was accepted'; end if;
end;
$$;

insert into public.clients (id, agency_id, program_id, name)
values
  ('cc000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000002', 'fills-target'),
  ('cc000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000001', null, 'mover'),
  ('cc000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000003', 'available-seat-1');

-- 5: moving a client to a full program fails and leaves its old assignment intact.
do $$
declare
  v_blocked boolean := false;
begin
  begin
    update public.clients
    set program_id = 'cb000000-0000-4000-8000-000000000002'
    where id = 'cc000000-0000-4000-8000-000000000005';
  exception when others then
    if sqlerrm <> 'PROGRAM_CAPACITY_REACHED' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then raise exception 'move to full program was accepted'; end if;
end;
$$;

select pg_temp.assert_true(
  (select program_id is null from public.clients where id = 'cc000000-0000-4000-8000-000000000005'),
  'failed transfer must retain the old assignment'
);

-- 6: moving to a program with a free seat succeeds.
update public.clients
set program_id = 'cb000000-0000-4000-8000-000000000003'
where id = 'cc000000-0000-4000-8000-000000000005';

-- 7: unrelated edits remain possible while a program is full.
update public.clients
set phone = '0600000000'
where id = 'cc000000-0000-4000-8000-000000000001';

-- The application's full-row upsert of an existing client must also remain valid.
insert into public.clients (id, agency_id, program_id, name, phone)
values (
  'cc000000-0000-4000-8000-000000000001',
  'ca000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'seat-1',
  '0611111111'
)
on conflict (id) do update
set phone = excluded.phone;

select pg_temp.assert_true(
  (select phone from public.clients where id = 'cc000000-0000-4000-8000-000000000001') = '0611111111',
  'unrelated client edit and existing-client upsert must remain possible'
);

-- 8: activation through unarchiving consumes a seat and is checked.
insert into public.clients (id, agency_id, program_id, name, archived, archived_at)
values (
  'cc000000-0000-4000-8000-000000000007',
  'ca000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000001',
  'archived-candidate',
  true,
  now()
);

do $$
declare
  v_blocked boolean := false;
begin
  begin
    update public.clients
    set archived = false, archived_at = null
    where id = 'cc000000-0000-4000-8000-000000000007';
  exception when others then
    if sqlerrm <> 'PROGRAM_CAPACITY_REACHED' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then raise exception 'reactivation in full program was accepted'; end if;
end;
$$;

-- 9: deactivation releases a seat; reactivation can then consume it.
update public.clients
set archived = true, archived_at = now()
where id = 'cc000000-0000-4000-8000-000000000002';

update public.clients
set archived = false, archived_at = null
where id = 'cc000000-0000-4000-8000-000000000007';

-- 10: another agency's client is counted only against its own program.
insert into public.clients (id, agency_id, program_id, name)
values ('cc000000-0000-4000-8000-000000000008', 'ca000000-0000-4000-8000-000000000002', 'cb000000-0000-4000-8000-000000000005', 'other-agency-client');

select pg_temp.assert_true(
  (select count(*) from public.clients where agency_id = 'ca000000-0000-4000-8000-000000000001' and program_id = 'cb000000-0000-4000-8000-000000000001' and archived = false) = 2,
  'other-agency clients must not affect this agency count'
);

-- 11: lowering capacity below the current active registration count fails.
do $$
declare
  v_blocked boolean := false;
begin
  begin
    update public.programs
    set seats = 1
    where id = 'cb000000-0000-4000-8000-000000000001';
  exception when others then
    if sqlerrm <> 'PROGRAM_CAPACITY_BELOW_REGISTRATION' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then raise exception 'invalid capacity reduction was accepted'; end if;
end;
$$;

-- Unchanged capacity and non-capacity program edits remain possible.
update public.programs
set seats = seats, notes = 'unrelated-edit'
where id = 'cb000000-0000-4000-8000-000000000001';

-- 12: zero keeps its existing unlimited meaning; NULL remains disallowed by schema.
insert into public.clients (id, agency_id, program_id, name)
select
  gen_random_uuid(),
  'ca000000-0000-4000-8000-000000000001',
  'cb000000-0000-4000-8000-000000000004',
  'unlimited-' || value
from generate_series(1, 5) as series(value);

select pg_temp.assert_true(
  (select attnotnull from pg_attribute where attrelid = 'public.programs'::regclass and attname = 'seats'),
  'the migration must preserve programs.seats NOT NULL'
);

-- A client without a program remains valid.
insert into public.clients (id, agency_id, program_id, name)
values ('cc000000-0000-4000-8000-000000000009', 'ca000000-0000-4000-8000-000000000001', null, 'unassigned');

rollback;
