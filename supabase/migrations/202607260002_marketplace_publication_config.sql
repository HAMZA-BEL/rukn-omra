-- Marketplace-only publication configuration.
-- Apply manually after review and after 202607260001_marketplace_listings.sql.

alter table public.marketplace_listings
  add column if not exists marketplace_config jsonb not null default '{}'::jsonb;

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_config_object_check;
alter table public.marketplace_listings
  add constraint marketplace_listings_config_object_check
  check (jsonb_typeof(marketplace_config) = 'object');

create or replace function public.validate_marketplace_config(p_config jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_config jsonb := coalesce(p_config, '{}'::jsonb);
  v_services jsonb;
  v_documents jsonb;
  v_seats jsonb;
begin
  if jsonb_typeof(v_config) <> 'object' then
    raise exception 'marketplace_config_object_required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(v_config) as key(name)
    where key.name not in (
      'included_services',
      'required_documents',
      'available_seats'
    )
  ) then
    raise exception 'marketplace_config_unknown_field' using errcode = '22023';
  end if;

  if v_config ? 'included_services'
    and jsonb_typeof(v_config->'included_services') <> 'array' then
    raise exception 'marketplace_services_array_required' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(v_config->'included_services', '[]'::jsonb)) > 20 then
    raise exception 'marketplace_services_limit_exceeded' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(v_config->'included_services', '[]'::jsonb)
    ) as item(value)
    where jsonb_typeof(item.value) <> 'string'
       or length(btrim(item.value #>> '{}')) > 160
  ) then
    raise exception 'marketplace_service_invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(btrim(item.value #>> '{}')) order by item.position)
      filter (where btrim(item.value #>> '{}') <> ''),
    '[]'::jsonb
  )
  into v_services
  from jsonb_array_elements(
    coalesce(v_config->'included_services', '[]'::jsonb)
  ) with ordinality as item(value, position);

  if v_config ? 'required_documents'
    and jsonb_typeof(v_config->'required_documents') <> 'array' then
    raise exception 'marketplace_documents_array_required' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(v_config->'required_documents', '[]'::jsonb)) > 20 then
    raise exception 'marketplace_documents_limit_exceeded' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(v_config->'required_documents', '[]'::jsonb)
    ) as item(value)
    where jsonb_typeof(item.value) <> 'string'
       or length(btrim(item.value #>> '{}')) > 160
  ) then
    raise exception 'marketplace_document_invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(btrim(item.value #>> '{}')) order by item.position)
      filter (where btrim(item.value #>> '{}') <> ''),
    '[]'::jsonb
  )
  into v_documents
  from jsonb_array_elements(
    coalesce(v_config->'required_documents', '[]'::jsonb)
  ) with ordinality as item(value, position);

  v_seats := v_config->'available_seats';
  if v_seats is not null and jsonb_typeof(v_seats) <> 'null' then
    if jsonb_typeof(v_seats) <> 'number'
      or (v_seats #>> '{}') !~ '^[0-9]+$'
      or (v_seats #>> '{}')::numeric > 100000 then
      raise exception 'marketplace_available_seats_invalid' using errcode = '22023';
    end if;
  end if;

  return jsonb_build_object(
    'included_services', v_services,
    'required_documents', v_documents,
    'available_seats',
      case
        when v_seats is null or jsonb_typeof(v_seats) = 'null' then 'null'::jsonb
        else to_jsonb((v_seats #>> '{}')::integer)
      end
  );
end;
$$;

revoke all on function public.validate_marketplace_config(jsonb)
  from public, anon, authenticated;

create or replace function public.build_marketplace_snapshot(
  p_program_id uuid,
  p_agency_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_program public.programs%rowtype;
  v_agency public.agencies%rowtype;
  v_config jsonb;
  v_starting_price numeric;
  v_packages jsonb;
begin
  select *
  into v_program
  from public.programs
  where id = p_program_id
    and agency_id = p_agency_id
    and coalesce(deleted, false) = false
    and deleted_at is null;

  if not found then
    raise exception 'marketplace_program_not_found' using errcode = 'P0002';
  end if;

  select *
  into v_agency
  from public.agencies
  where id = p_agency_id;

  if not found then
    raise exception 'marketplace_agency_not_found' using errcode = 'P0002';
  end if;

  select public.validate_marketplace_config(listing.marketplace_config)
  into v_config
  from public.marketplace_listings listing
  where listing.program_id = p_program_id
    and listing.agency_id = p_agency_id;
  v_config := coalesce(
    v_config,
    public.validate_marketplace_config('{}'::jsonb)
  );

  v_starting_price := public.marketplace_starting_price(v_program.price_table);

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'level', nullif(btrim(package.item->>'level'), ''),
      'hotel_mecca', nullif(btrim(package.item->>'hotelMecca'), ''),
      'hotel_madina', nullif(btrim(package.item->>'hotelMadina'), ''),
      'madinah_nights',
        case
          when coalesce(package.item->>'madinahNights', '') ~ '^[0-9]+$'
            then (package.item->>'madinahNights')::integer
          else null
        end,
      'meal_plan', nullif(btrim(package.item->>'mealPlan'), ''),
      'prices', coalesce((
        select jsonb_object_agg(price.key, price.value::numeric)
        from jsonb_each_text(
          case
            when jsonb_typeof(package.item->'prices') = 'object'
              then package.item->'prices'
            else '{}'::jsonb
          end
        ) as price(key, value)
        where price.key in ('single', 'double', 'triple', 'quad', 'quint')
          and price.value ~ '^[[:space:]]*[0-9]+([.][0-9]+)?[[:space:]]*$'
          and price.value::numeric > 0
      ), '{}'::jsonb)
    ))
    order by package.position
  ), '[]'::jsonb)
  into v_packages
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(v_program.price_table, '[]'::jsonb)) = 'array'
        then coalesce(v_program.price_table, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as package(item, position);

  return jsonb_strip_nulls(jsonb_build_object(
    'schema_version', 2,
    'title', nullif(btrim(v_program.name), ''),
    'title_fr', nullif(btrim(v_program.name_fr), ''),
    'program_type', nullif(btrim(v_program.type), ''),
    'departure_date', nullif(btrim(v_program.departure), ''),
    'return_date', nullif(btrim(v_program.return_date), ''),
    'duration', nullif(btrim(v_program.duration), ''),
    'transport', nullif(btrim(v_program.transport), ''),
    'route', coalesce(
      nullif(btrim(v_program.poster_travel_route), ''),
      nullif(btrim(v_program.outbound_route_text), '')
    ),
    'starting_price', v_starting_price,
    'packages', v_packages,
    'agency', jsonb_strip_nulls(jsonb_build_object(
      'name_ar', nullif(btrim(v_agency.name_ar), ''),
      'name_fr', nullif(btrim(v_agency.name_fr), ''),
      'city', nullif(btrim(v_agency.agency_city), ''),
      'contact_phone', coalesce(
        nullif(btrim(v_agency.phone_tiznit1), ''),
        nullif(btrim(v_agency.phone_agadir1), '')
      ),
      'website', nullif(btrim(v_agency.website), '')
    ))
  )) || jsonb_build_object(
    'included_services', v_config->'included_services',
    'required_documents', v_config->'required_documents',
    'available_seats', v_config->'available_seats'
  );
end;
$$;

revoke all on function public.build_marketplace_snapshot(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.save_marketplace_listing_config(
  p_program_id uuid,
  p_marketplace_config jsonb
)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_agency_id uuid;
  v_config jsonb;
  v_snapshot jsonb;
  v_listing public.marketplace_listings;
begin
  v_agency_id := public.get_agency_id();
  if v_agency_id is null then
    raise exception 'marketplace_unauthorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.agency_features feature
    join public.agencies agency
      on agency.id = feature.agency_id
     and agency.status = 'active'
    where feature.agency_id = v_agency_id
      and feature.feature_key = 'marketplace_access'
      and feature.enabled = true
  ) then
    raise exception 'marketplace_access_required' using errcode = '42501';
  end if;

  v_config := public.validate_marketplace_config(p_marketplace_config);
  v_snapshot := public.build_marketplace_snapshot(p_program_id, v_agency_id);

  insert into public.marketplace_listings (
    agency_id,
    program_id,
    status,
    public_data,
    marketplace_config
  )
  values (
    v_agency_id,
    p_program_id,
    'draft',
    v_snapshot,
    v_config
  )
  on conflict (agency_id, program_id)
  do update set marketplace_config = excluded.marketplace_config
  returning * into v_listing;

  if v_listing.status = 'draft' then
    update public.marketplace_listings
    set public_data = public.build_marketplace_snapshot(p_program_id, v_agency_id)
    where id = v_listing.id
    returning * into v_listing;
  end if;

  return v_listing;
end;
$$;

revoke all on function public.save_marketplace_listing_config(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_marketplace_listing_config(uuid, jsonb)
  to authenticated;
