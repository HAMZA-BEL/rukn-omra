-- Marketplace publication snapshots.
-- Apply manually after review. This migration is additive and does not modify
-- the internal programs table.

create table if not exists public.marketplace_listings (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  program_id   uuid not null references public.programs(id) on delete restrict,
  status       text not null default 'draft',
  public_slug  text,
  public_data  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz,
  constraint marketplace_listings_status_check
    check (status in ('draft', 'published', 'hidden')),
  constraint marketplace_listings_agency_program_unique
    unique (agency_id, program_id),
  constraint marketplace_listings_public_slug_unique
    unique (public_slug),
  constraint marketplace_listings_public_slug_format
    check (public_slug is null or public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists idx_marketplace_listings_agency_status
  on public.marketplace_listings (agency_id, status);

create index if not exists idx_marketplace_listings_published
  on public.marketplace_listings (published_at desc, id desc)
  where status = 'published';

create or replace function public.touch_marketplace_listing_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_marketplace_listings_updated_at
  on public.marketplace_listings;
create trigger trg_marketplace_listings_updated_at
before update on public.marketplace_listings
for each row execute function public.touch_marketplace_listing_updated_at();

alter table public.marketplace_listings enable row level security;

drop policy if exists "marketplace_listings_select_own"
  on public.marketplace_listings;
create policy "marketplace_listings_select_own"
  on public.marketplace_listings
  for select
  using (agency_id = public.get_agency_id());

-- Authenticated users can only read their agency rows directly. All mutations
-- go through the security-definer RPCs below.
revoke all on public.marketplace_listings from public, anon, authenticated;
grant select on public.marketplace_listings to authenticated;

-- Server-authoritative starting price. Only explicitly public room prices are
-- considered; programCosting and all other package properties are ignored.
create or replace function public.marketplace_starting_price(p_price_table jsonb)
returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select min(price.value::numeric)
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_price_table, '[]'::jsonb)) = 'array'
        then coalesce(p_price_table, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) as package(item)
  cross join lateral jsonb_each_text(
    case
      when jsonb_typeof(package.item->'prices') = 'object'
        then package.item->'prices'
      else '{}'::jsonb
    end
  ) as price(key, value)
  where price.key in ('single', 'double', 'triple', 'quad', 'quint')
    and price.value ~ '^[[:space:]]*[0-9]+([.][0-9]+)?[[:space:]]*$'
    and price.value::numeric > 0
$$;

-- Central allowlist snapshot builder. This function is intentionally not
-- executable by API roles; mutation RPCs call it after checking tenant access.
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
    raise exception 'marketplace_program_not_found'
      using errcode = 'P0002';
  end if;

  select *
  into v_agency
  from public.agencies
  where id = p_agency_id;

  if not found then
    raise exception 'marketplace_agency_not_found'
      using errcode = 'P0002';
  end if;

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
    'schema_version', 1,
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
  ));
end;
$$;

revoke all on function public.marketplace_starting_price(jsonb)
  from public, anon, authenticated;
revoke all on function public.build_marketplace_snapshot(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.prepare_marketplace_listing(p_program_id uuid)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_agency_id uuid;
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

  v_snapshot := public.build_marketplace_snapshot(p_program_id, v_agency_id);

  insert into public.marketplace_listings (
    agency_id,
    program_id,
    status,
    public_data
  )
  values (
    v_agency_id,
    p_program_id,
    'draft',
    v_snapshot
  )
  on conflict (agency_id, program_id)
  do update set
    public_data = case
      when marketplace_listings.status = 'published'
        then marketplace_listings.public_data
      else excluded.public_data
    end,
    status = case
      when marketplace_listings.status = 'published' then 'published'
      else 'draft'
    end
  returning * into v_listing;

  return v_listing;
end;
$$;

create or replace function public.publish_marketplace_listing(p_program_id uuid)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_agency_id uuid;
  v_snapshot jsonb;
  v_listing public.marketplace_listings;
  v_slug_base text;
  v_slug text;
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

  select *
  into v_listing
  from public.marketplace_listings
  where agency_id = v_agency_id
    and program_id = p_program_id
  for update;

  if not found then
    raise exception 'marketplace_draft_required'
      using errcode = 'P0002';
  end if;

  v_snapshot := public.build_marketplace_snapshot(p_program_id, v_agency_id);
  if (v_snapshot->>'starting_price') is null
    or (v_snapshot->>'starting_price')::numeric <= 0 then
    raise exception 'marketplace_valid_price_required'
      using errcode = '22023';
  end if;

  if v_listing.public_slug is null then
    select nullif(
      trim(both '-' from regexp_replace(
        lower(coalesce(name_fr, name, 'program')),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    )
    into v_slug_base
    from public.programs
    where id = p_program_id
      and agency_id = v_agency_id;

    v_slug := coalesce(v_slug_base, 'program')
      || '-' || replace(p_program_id::text, '-', '');
  else
    v_slug := v_listing.public_slug;
  end if;

  update public.marketplace_listings
  set status = 'published',
      public_slug = v_slug,
      public_data = v_snapshot,
      published_at = now()
  where id = v_listing.id
  returning * into v_listing;

  return v_listing;
end;
$$;

create or replace function public.hide_marketplace_listing(p_program_id uuid)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_agency_id uuid;
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

  update public.marketplace_listings
  set status = 'hidden'
  where agency_id = v_agency_id
    and program_id = p_program_id
  returning * into v_listing;

  if not found then
    raise exception 'marketplace_listing_not_found'
      using errcode = 'P0002';
  end if;

  return v_listing;
end;
$$;

revoke all on function public.prepare_marketplace_listing(uuid)
  from public, anon, authenticated;
revoke all on function public.publish_marketplace_listing(uuid)
  from public, anon, authenticated;
revoke all on function public.hide_marketplace_listing(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_marketplace_listing(uuid)
  to authenticated;
grant execute on function public.publish_marketplace_listing(uuid)
  to authenticated;
grant execute on function public.hide_marketplace_listing(uuid)
  to authenticated;

-- Public reads never expose the table or internal programs. Feature access is
-- checked again so disabling marketplace_access removes the agency publicly.
create or replace function public.get_public_marketplace_listings(
  p_slug text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  listing_id uuid,
  public_slug text,
  public_data jsonb,
  published_at timestamptz
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select
    listing.id,
    listing.public_slug,
    listing.public_data,
    listing.published_at
  from public.marketplace_listings listing
  join public.agencies agency
    on agency.id = listing.agency_id
   and agency.status = 'active'
  where listing.status = 'published'
    and listing.public_slug is not null
    and (p_slug is null or listing.public_slug = p_slug)
    and exists (
      select 1
      from public.agency_features feature
      where feature.agency_id = listing.agency_id
        and feature.feature_key = 'marketplace_access'
        and feature.enabled = true
    )
  order by listing.published_at desc, listing.id desc
  limit case
    when p_slug is not null then 1
    else greatest(1, least(coalesce(p_limit, 24), 100))
  end
  offset case
    when p_slug is not null then 0
    else greatest(0, coalesce(p_offset, 0))
  end
$$;

create or replace function public.get_public_marketplace_agencies()
returns table (
  agency_public_data jsonb,
  published_listings_count bigint
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select
    jsonb_strip_nulls(jsonb_build_object(
      'name_ar', agency.name_ar,
      'name_fr', agency.name_fr,
      'city', agency.agency_city,
      'contact_phone', coalesce(agency.phone_tiznit1, agency.phone_agadir1),
      'website', agency.website
    )),
    count(listing.id)
  from public.agencies agency
  join public.marketplace_listings listing
    on listing.agency_id = agency.id
   and listing.status = 'published'
  join public.agency_features feature
    on feature.agency_id = agency.id
   and feature.feature_key = 'marketplace_access'
   and feature.enabled = true
  where agency.status = 'active'
  group by
    agency.id,
    agency.name_ar,
    agency.name_fr,
    agency.agency_city,
    agency.phone_tiznit1,
    agency.phone_agadir1,
    agency.website
  order by agency.name_ar nulls last, agency.name_fr nulls last
$$;

revoke all on function public.get_public_marketplace_listings(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_public_marketplace_agencies()
  from public, anon, authenticated;
grant execute on function public.get_public_marketplace_listings(text, integer, integer)
  to anon, authenticated;
grant execute on function public.get_public_marketplace_agencies()
  to anon, authenticated;
