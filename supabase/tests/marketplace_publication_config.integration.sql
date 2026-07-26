-- Run only against an isolated database after applying marketplace migrations.
-- All fixtures are rolled back.

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end;
$$;

insert into public.agencies (id, name_ar, status)
values
  ('ea000000-0000-4000-8000-000000000001', 'config-a', 'active'),
  ('ea000000-0000-4000-8000-000000000002', 'config-b', 'active');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values (
  'ea100000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'config-a@example.test', '',
  now(), now(), now()
);

insert into public.users (id, agency_id, email, role, status)
values (
  'ea100000-0000-4000-8000-000000000001',
  'ea000000-0000-4000-8000-000000000001',
  'config-a@example.test', 'owner', 'active'
);

insert into public.agency_features (agency_id, feature_key, enabled)
values
  ('ea000000-0000-4000-8000-000000000001', 'marketplace_access', true),
  ('ea000000-0000-4000-8000-000000000002', 'marketplace_access', true);

insert into public.programs (
  id, agency_id, name, type, departure, return_date, price_table
) values
  (
    'eb000000-0000-4000-8000-000000000001',
    'ea000000-0000-4000-8000-000000000001',
    'Config program A', 'عمرة', '2026-09-01', '2026-09-10',
    '[{"prices":{"double":15000},"programCosting":{"internalCost":9000}}]'::jsonb
  ),
  (
    'eb000000-0000-4000-8000-000000000002',
    'ea000000-0000-4000-8000-000000000002',
    'Config program B', 'عمرة', '2026-10-01', '2026-10-10',
    '[{"prices":{"double":16000}}]'::jsonb
  );

-- Validation normalizes whitespace and preserves explicit list order.
select pg_temp.assert_true(
  public.validate_marketplace_config(
    '{
      "included_services":["  second  ","","first"],
      "required_documents":[" passport ","  ","photo"],
      "available_seats":null
    }'::jsonb
  ) = '{
    "included_services":["second","first"],
    "required_documents":["passport","photo"],
    "available_seats":null
  }'::jsonb,
  'lists must be trimmed, emptied, and kept in order; null seats must survive'
);

do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.validate_marketplace_config(
      '{"included_services":{"bad":true}}'::jsonb
    );
  exception when sqlstate '22023' then v_rejected := true;
  end;
  if not v_rejected then raise exception 'invalid service structure accepted'; end if;
end;
$$;

do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.validate_marketplace_config(
      '{"required_documents":[1]}'::jsonb
    );
  exception when sqlstate '22023' then v_rejected := true;
  end;
  if not v_rejected then raise exception 'non-string document accepted'; end if;
end;
$$;

do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.validate_marketplace_config('{"available_seats":-1}'::jsonb);
  exception when sqlstate '22023' then v_rejected := true;
  end;
  if not v_rejected then raise exception 'negative seats accepted'; end if;
end;
$$;

do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.validate_marketplace_config('{"available_seats":1.5}'::jsonb);
  exception when sqlstate '22023' then v_rejected := true;
  end;
  if not v_rejected then raise exception 'decimal seats accepted'; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ea100000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- The current agency cannot save configuration against another agency program.
do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.save_marketplace_listing_config(
      'eb000000-0000-4000-8000-000000000002',
      '{"included_services":[]}'::jsonb
    );
  exception when others then
    if sqlerrm <> 'marketplace_program_not_found' then raise; end if;
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'cross-agency config accepted'; end if;
end;
$$;

select public.save_marketplace_listing_config(
  'eb000000-0000-4000-8000-000000000001',
  '{
    "included_services":["Service A","Service B"],
    "required_documents":["Document A","Document B"],
    "available_seats":25
  }'::jsonb
);

select pg_temp.assert_true(
  (select marketplace_config->'included_services'->>0 = 'Service A'
     and marketplace_config->'included_services'->>1 = 'Service B'
     and marketplace_config->'required_documents'->>0 = 'Document A'
     and marketplace_config->'required_documents'->>1 = 'Document B'
     and (marketplace_config->>'available_seats')::integer = 25
   from public.marketplace_listings
   where program_id = 'eb000000-0000-4000-8000-000000000001'),
  'saved configuration must preserve services, documents, and seats'
);

select public.publish_marketplace_listing(
  'eb000000-0000-4000-8000-000000000001'
);

create temporary table first_publication as
select public_data
from public.marketplace_listings
where program_id = 'eb000000-0000-4000-8000-000000000001';

select public.save_marketplace_listing_config(
  'eb000000-0000-4000-8000-000000000001',
  '{
    "included_services":["Changed service"],
    "required_documents":["Changed document"],
    "available_seats":8
  }'::jsonb
);

select pg_temp.assert_true(
  (select listing.public_data = first_publication.public_data
   from public.marketplace_listings listing
   cross join first_publication
   where listing.program_id = 'eb000000-0000-4000-8000-000000000001'),
  'saving published config must not mutate the published snapshot'
);

select public.publish_marketplace_listing(
  'eb000000-0000-4000-8000-000000000001'
);

select pg_temp.assert_true(
  (select public_data->'included_services' = '["Changed service"]'::jsonb
     and public_data->'required_documents' = '["Changed document"]'::jsonb
     and (public_data->>'available_seats')::integer = 8
     and public_data::text !~ 'programCosting|internalCost'
   from public.marketplace_listings
   where program_id = 'eb000000-0000-4000-8000-000000000001'),
  'republish must copy validated config and keep costing private'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.get_public_marketplace_listings(null, 24, 0)
    where public_data->'included_services' = '["Changed service"]'::jsonb
  ),
  'public RPC must return the new snapshot fields'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_public_marketplace_listings(null, 24, 0) as public_row
    where to_jsonb(public_row) ? 'marketplace_config'
       or public_row.public_data ? 'marketplace_config'
  ),
  'public RPC must not expose marketplace_config'
);

rollback;
