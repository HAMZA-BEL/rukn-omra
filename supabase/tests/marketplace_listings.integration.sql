-- Run only against an isolated test database after applying
-- 202607260001_marketplace_listings.sql. All fixtures are rolled back.

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

insert into public.agencies (id, name_ar, name_fr, agency_city, phone_tiznit1)
values
  ('da000000-0000-4000-8000-000000000001', 'market-a', 'market-a', 'Tiznit', '0600000001'),
  ('da000000-0000-4000-8000-000000000002', 'market-b', 'market-b', 'Agadir', '0600000002');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values (
  'da100000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'market-a@example.test',
  '',
  now(),
  now(),
  now()
);

insert into public.users (id, agency_id, email, role, status)
values (
  'da100000-0000-4000-8000-000000000001',
  'da000000-0000-4000-8000-000000000001',
  'market-a@example.test',
  'owner',
  'active'
);

insert into public.agency_features (agency_id, feature_key, enabled)
values
  ('da000000-0000-4000-8000-000000000001', 'marketplace_access', true),
  ('da000000-0000-4000-8000-000000000002', 'marketplace_access', true);

insert into public.programs (
  id, agency_id, name, name_fr, type, duration, departure, return_date,
  price_table, notes
)
values
  (
    'db000000-0000-4000-8000-000000000001',
    'da000000-0000-4000-8000-000000000001',
    'برنامج وكالة أ',
    'Programme A',
    'عمرة',
    '12',
    '2026-08-01',
    '2026-08-12',
    '[{"level":"first","prices":{"double":18000},"programCosting":{"internalCost":10000}},{"level":"second","prices":{"triple":16500}}]'::jsonb,
    'secret internal note'
  ),
  (
    'db000000-0000-4000-8000-000000000002',
    'da000000-0000-4000-8000-000000000002',
    'برنامج وكالة ب',
    'Programme B',
    'عمرة',
    '10',
    '2026-09-01',
    '2026-09-10',
    '[{"prices":{"double":15000}}]'::jsonb,
    null
  ),
  (
    'db000000-0000-4000-8000-000000000003',
    'da000000-0000-4000-8000-000000000001',
    'برنامج بلا سعر',
    'No price',
    'عمرة',
    '8',
    '2026-10-01',
    '2026-10-08',
    '[{"prices":{"double":0,"triple":-10,"child":500}}]'::jsonb,
    null
  );

-- Snapshot allowlist and public starting price.
select pg_temp.assert_true(
  (public.build_marketplace_snapshot(
    'db000000-0000-4000-8000-000000000001',
    'da000000-0000-4000-8000-000000000001'
  )->>'starting_price')::numeric = 16500,
  'starting_price must use the lowest positive public room price'
);

select pg_temp.assert_true(
  public.build_marketplace_snapshot(
    'db000000-0000-4000-8000-000000000001',
    'da000000-0000-4000-8000-000000000001'
  )::text !~ 'programCosting|internalCost|secret internal note',
  'snapshot must exclude costing and internal notes'
);

select pg_temp.assert_true(
  public.build_marketplace_snapshot(
    'db000000-0000-4000-8000-000000000001',
    'da000000-0000-4000-8000-000000000001'
  )->'packages'->0->>'level' = 'first'
  and public.build_marketplace_snapshot(
    'db000000-0000-4000-8000-000000000001',
    'da000000-0000-4000-8000-000000000001'
  )->'packages'->1->>'level' = 'second',
  'snapshot packages must preserve price_table order'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'da100000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Agency A cannot prepare agency B's program.
do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.prepare_marketplace_listing(
      'db000000-0000-4000-8000-000000000002'
    );
  exception when others then
    if sqlerrm <> 'marketplace_program_not_found' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'cross-agency program publication was accepted';
  end if;
end;
$$;

-- First prepare creates one draft. Repeating it updates the same listing.
select public.prepare_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  (select count(*) from public.marketplace_listings
   where program_id = 'db000000-0000-4000-8000-000000000001') = 1,
  'first prepare must create one listing'
);

select public.prepare_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  (select count(*) from public.marketplace_listings
   where program_id = 'db000000-0000-4000-8000-000000000001') = 1,
  'repeated prepare must not create a duplicate'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_public_marketplace_listings(null)
    where public_data->>'title' = 'برنامج وكالة أ'
  ),
  'draft must not be public'
);

select public.publish_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

create temporary table marketplace_first_publish as
select id, public_slug, public_data
from public.marketplace_listings
where program_id = 'db000000-0000-4000-8000-000000000001';

select pg_temp.assert_true(
  exists (
    select 1
    from public.get_public_marketplace_listings(null)
    where public_data->>'title' = 'برنامج وكالة أ'
  ),
  'published listing must be public'
);

-- Suspending the agency removes both its listings and public agency identity.
reset role;
update public.agencies
set status = 'suspended', suspended_at = now()
where id = 'da000000-0000-4000-8000-000000000001';
set local role authenticated;

select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_public_marketplace_listings(null)
    where public_data->>'title' = 'برنامج وكالة أ'
  ),
  'suspended agency listings must not be public'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_public_marketplace_agencies()
    where agency_public_data->>'name_ar' = 'market-a'
  ),
  'suspended agency identity must not be public'
);

reset role;
update public.agencies
set status = 'active', suspended_at = null
where id = 'da000000-0000-4000-8000-000000000001';
set local role authenticated;

-- Internal edits do not change the snapshot until explicit republish.
reset role;
update public.programs
set name = 'برنامج وكالة أ محدث',
    price_table = '[{"prices":{"double":14000}}]'::jsonb
where id = 'db000000-0000-4000-8000-000000000001';
set local role authenticated;

select pg_temp.assert_true(
  (select public_data->>'title'
   from public.marketplace_listings
   where program_id = 'db000000-0000-4000-8000-000000000001') = 'برنامج وكالة أ',
  'internal edit must not mutate the published snapshot'
);

select public.prepare_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  (select public_data->>'title'
   from public.marketplace_listings
   where program_id = 'db000000-0000-4000-8000-000000000001') = 'برنامج وكالة أ',
  'preparing an already-published listing must not mutate its public snapshot'
);

select public.publish_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  (select listing.id = first_publish.id
     and listing.public_slug = first_publish.public_slug
     and listing.public_data->>'title' = 'برنامج وكالة أ محدث'
   from public.marketplace_listings listing
   cross join marketplace_first_publish first_publish
   where listing.program_id = 'db000000-0000-4000-8000-000000000001'),
  'republish must update the same listing while preserving its slug'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.get_public_marketplace_agencies()
    where agency_public_data->>'name_ar' = 'market-a'
      and published_listings_count = 1
  ),
  'public agencies must require an enabled feature and a published listing'
);

-- Hidden records stay persisted but disappear publicly.
select public.hide_marketplace_listing(
  'db000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_public_marketplace_listings(null)
    where public_data->>'title' = 'برنامج وكالة أ محدث'
  ),
  'hidden listing must not be public'
);

select pg_temp.assert_true(
  (select count(*) from public.marketplace_listings
   where program_id = 'db000000-0000-4000-8000-000000000001') = 1,
  'hide must not delete the listing'
);

-- The internal program cannot be hard-deleted while its listing exists.
reset role;
do $$
declare
  v_blocked boolean := false;
begin
  begin
    delete from public.programs
    where id = 'db000000-0000-4000-8000-000000000001';
  exception when foreign_key_violation then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'hard delete unexpectedly removed a marketplace-linked program';
  end if;
end;
$$;
set local role authenticated;

-- A program without a valid public room price cannot be published.
select public.prepare_marketplace_listing(
  'db000000-0000-4000-8000-000000000003'
);

do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.publish_marketplace_listing(
      'db000000-0000-4000-8000-000000000003'
    );
  exception when others then
    if sqlerrm <> 'marketplace_valid_price_required' then raise; end if;
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'program without a valid public price was published';
  end if;
end;
$$;

-- Counts are derived from persisted rows.
select pg_temp.assert_true(
  (select count(*) from public.marketplace_listings where status = 'draft') = 1
  and (select count(*) from public.marketplace_listings where status = 'hidden') = 1
  and (select count(*) from public.marketplace_listings where status = 'published') = 0,
  'listing counters must reflect database statuses'
);

rollback;
