-- Paginated active Programs summary RPC.
-- Read-only: returns compact program card rows for the caller's agency only.
-- Security-sensitive: this function never accepts agency_id from the frontend.
-- It resolves the active agency through public.get_agency_id().

create or replace function public.get_programs_page(
  p_search text default '',
  p_year integer default null,
  p_type text default 'all',
  p_status text default 'all',
  p_limit integer default 12,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_agency_id uuid;
  safe_search text;
  safe_year integer;
  safe_type text;
  safe_status text;
  safe_limit integer;
  safe_offset integer;
  result jsonb;
begin
  current_agency_id := public.get_agency_id();

  safe_search := lower(coalesce(nullif(trim(p_search), ''), ''));
  safe_year := p_year;
  safe_type := lower(coalesce(nullif(trim(p_type), ''), 'all'));
  if safe_type not in ('all', 'umrah', 'hajj') then
    safe_type := 'all';
  end if;
  safe_status := lower(coalesce(nullif(trim(p_status), ''), 'all'));
  if safe_status not in ('all', 'cleared', 'not_cleared', 'full', 'not_full') then
    safe_status := 'all';
  end if;
  safe_limit := least(100, greatest(1, coalesce(p_limit, 12)));
  safe_offset := greatest(0, coalesce(p_offset, 0));

  if current_agency_id is null then
    return jsonb_build_object(
      'items', '[]'::jsonb,
      'total_count', 0,
      'limit', safe_limit,
      'offset', safe_offset,
      'search', safe_search,
      'year', safe_year,
      'type', safe_type,
      'status', safe_status
    );
  end if;

  with active_programs as (
    select
      p.id,
      p.name,
      p.name_fr,
      p.type,
      p.duration,
      p.departure,
      p.return_date,
      p.seats,
      p.hotel_mecca,
      p.hotel_madina,
      p.price_table,
      coalesce(p.status, 'active') as status,
      p.created_at,
      case
        when lower(coalesce(p.type, '')) like '%hajj%'
          or lower(coalesce(p.type, '')) like '%hadj%'
          or coalesce(p.type, '') like '%حج%'
          then 'hajj'
        when lower(coalesce(p.type, '')) like '%umrah%'
          or lower(coalesce(p.type, '')) like '%omrah%'
          or lower(coalesce(p.type, '')) like '%omra%'
          or coalesce(p.type, '') like '%عمرة%'
          then 'umrah'
        when lower(coalesce(p.name, '')) like '%hajj%'
          or lower(coalesce(p.name_fr, '')) like '%hajj%'
          or lower(coalesce(p.name, '')) like '%hadj%'
          or lower(coalesce(p.name_fr, '')) like '%hadj%'
          or coalesce(p.name, '') like '%حج%'
          or coalesce(p.name_fr, '') like '%حج%'
          then 'hajj'
        when lower(coalesce(p.name, '')) like '%umrah%'
          or lower(coalesce(p.name_fr, '')) like '%umrah%'
          or lower(coalesce(p.name, '')) like '%omrah%'
          or lower(coalesce(p.name_fr, '')) like '%omrah%'
          or lower(coalesce(p.name, '')) like '%omra%'
          or lower(coalesce(p.name_fr, '')) like '%omra%'
          or coalesce(p.name, '') like '%عمرة%'
          or coalesce(p.name_fr, '') like '%عمرة%'
          then 'umrah'
        else 'umrah'
      end as type_kind,
      case
        when substring(coalesce(p.departure, '') from '([0-9]{4})') is null then null
        else substring(coalesce(p.departure, '') from '([0-9]{4})')::integer
      end as year
    from public.programs p
    where p.agency_id = current_agency_id
      and coalesce(p.deleted, false) = false
      and p.deleted_at is null
      and lower(coalesce(p.status, 'active')) <> 'archived'
  ),
  program_package_rows as (
    select
      ap.id as program_id,
      pkg.package,
      pkg.ordinality
    from active_programs ap
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(ap.price_table) = 'array' then ap.price_table
        else '[]'::jsonb
      end
    ) with ordinality as pkg(package, ordinality)
    where jsonb_typeof(pkg.package) = 'object'
  ),
  package_counts as (
    select
      program_id,
      count(*)::integer as package_count
    from program_package_rows
    group by program_id
  ),
  package_prices as (
    select
      ppr.program_id,
      min(price_amount.amount) as starting_price
    from program_package_rows ppr
    cross join lateral jsonb_each_text(
      case
        when jsonb_typeof(ppr.package->'prices') = 'object' then ppr.package->'prices'
        else '{}'::jsonb
      end
    ) as price(key, value)
    cross join lateral (
      select case
        when trim(price.value) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
          then trim(price.value)::numeric
        else null
      end as amount
    ) price_amount
    where price.key in ('single', 'double', 'triple', 'quad', 'quint')
      and price_amount.amount > 0
    group by ppr.program_id
  ),
  primary_packages as (
    select distinct on (program_id)
      program_id,
      nullif(trim(package->>'hotelMecca'), '') as primary_hotel_mecca,
      nullif(trim(package->>'hotelMadina'), '') as primary_hotel_madina
    from program_package_rows
    order by program_id, ordinality
  ),
  program_package_summary as (
    select
      ap.id as program_id,
      greatest(coalesce(pc.package_count, 0), 1)::integer as package_count,
      coalesce(pp.starting_price, 0)::numeric as starting_price,
      coalesce(pk.primary_hotel_mecca, ap.hotel_mecca, '') as primary_hotel_mecca,
      coalesce(pk.primary_hotel_madina, ap.hotel_madina, '') as primary_hotel_madina
    from active_programs ap
    left join package_counts pc
      on pc.program_id = ap.id
    left join package_prices pp
      on pp.program_id = ap.id
    left join primary_packages pk
      on pk.program_id = ap.id
  ),
  active_clients as (
    select
      c.id,
      c.program_id,
      c.hotel_level,
      c.room_type,
      coalesce(c.official_price, 0)::numeric as official_price,
      coalesce(c.sale_price, 0)::numeric as sale_price,
      c.docs,
      ap.price_table
    from public.clients c
    join active_programs ap
      on ap.id = c.program_id
    where c.agency_id = current_agency_id
      and coalesce(c.deleted, false) = false
      and c.deleted_at is null
      and coalesce(c.archived, false) = false
  ),
  client_price_inputs as (
    select
      ac.*,
      case
        when lower(coalesce(nullif(trim(ac.docs->>'serviceType'), ''), nullif(trim(ac.docs->>'service_type'), ''), '')) in (
          'full_package',
          'without_visa',
          'ticket_only',
          'accommodation_only',
          'visa_only'
        ) then lower(coalesce(nullif(trim(ac.docs->>'serviceType'), ''), nullif(trim(ac.docs->>'service_type'), '')))
        else 'full_package'
      end as service_type,
      case
        when lower(trim(coalesce(ac.room_type, ''))) in ('single') or trim(coalesce(ac.room_type, '')) in ('غرفة مفردة', 'فردية') then 'single'
        when lower(trim(coalesce(ac.room_type, ''))) in ('double') or trim(coalesce(ac.room_type, '')) in ('غرفة مزدوجة', 'غرفة ثنائية', 'ثنائية') then 'double'
        when lower(trim(coalesce(ac.room_type, ''))) in ('triple') or trim(coalesce(ac.room_type, '')) in ('غرفة ثلاثية', 'ثلاثية') then 'triple'
        when lower(trim(coalesce(ac.room_type, ''))) in ('quad') or trim(coalesce(ac.room_type, '')) in ('غرفة رباعية', 'رباعية') then 'quad'
        when lower(trim(coalesce(ac.room_type, ''))) in ('quint') or trim(coalesce(ac.room_type, '')) in ('غرفة خماسية', 'خماسية') then 'quint'
        else coalesce(nullif(lower(trim(ac.room_type)), ''), 'double')
      end as room_type_key,
      selected_pkg.package as selected_package,
      costing.program_costing
    from active_clients ac
    left join lateral (
      select ppr.package
      from program_package_rows ppr
      where ppr.program_id = ac.program_id
      order by
        case
          when nullif(trim(ac.docs->>'packageId'), '') is not null
            and ppr.package->>'id' = nullif(trim(ac.docs->>'packageId'), '')
            then 0
          when nullif(trim(ac.hotel_level), '') is not null
            and ppr.package->>'level' = nullif(trim(ac.hotel_level), '')
            then 1
          else 2
        end,
        ppr.ordinality
      limit 1
    ) selected_pkg on true
    left join lateral (
      select ppr.package->'programCosting' as program_costing
      from program_package_rows ppr
      where ppr.program_id = ac.program_id
        and jsonb_typeof(ppr.package->'programCosting') = 'object'
      order by ppr.ordinality
      limit 1
    ) costing on true
  ),
  client_effective_prices as (
    select
      cpi.id,
      cpi.program_id,
      case
        when cpi.sale_price > 0 then cpi.sale_price
        when cpi.service_type = 'ticket_only' then coalesce(
          case
            when trim(coalesce(cpi.program_costing->'standaloneSalePrices'->>'ticketOnly', '')) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
              then nullif(greatest(trim(cpi.program_costing->'standaloneSalePrices'->>'ticketOnly')::numeric, 0), 0)
            else null
          end,
          case
            when trim(coalesce(cpi.program_costing->'sharedCosts'->>'flight', '')) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
              then nullif(greatest(trim(cpi.program_costing->'sharedCosts'->>'flight')::numeric, 0), 0)
            else null
          end,
          0
        )
        when cpi.service_type = 'visa_only' then coalesce(
          case
            when trim(coalesce(cpi.program_costing->'standaloneSalePrices'->>'visaOnly', '')) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
              then nullif(greatest(trim(cpi.program_costing->'standaloneSalePrices'->>'visaOnly')::numeric, 0), 0)
            else null
          end,
          case
            when trim(coalesce(cpi.program_costing->'sharedCosts'->>'visa', '')) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
              then nullif(greatest(trim(cpi.program_costing->'sharedCosts'->>'visa')::numeric, 0), 0)
            else null
          end,
          0
        )
        else coalesce(
          nullif(cpi.official_price, 0),
          case
            when cpi.selected_package is not null
              and jsonb_typeof(cpi.selected_package->'prices') = 'object'
              and trim(coalesce(cpi.selected_package->'prices'->>cpi.room_type_key, '')) ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
              then nullif(greatest(trim(cpi.selected_package->'prices'->>cpi.room_type_key)::numeric, 0), 0)
            else null
          end,
          0
        )
      end as effective_sale_price
    from client_price_inputs cpi
  ),
  client_payment_totals as (
    select
      cep.id,
      cep.program_id,
      cep.effective_sale_price,
      coalesce(sum(coalesce(pay.amount, 0)), 0)::numeric as paid
    from client_effective_prices cep
    left join public.payments pay
      on pay.agency_id = current_agency_id
      and pay.client_id = cep.id
      and coalesce(pay.status, 'active') = 'active'
      and pay.trashed_at is null
      and pay.deleted_at is null
    group by cep.id, cep.program_id, cep.effective_sale_price
  ),
  client_statuses as (
    select
      cpt.id,
      cpt.program_id,
      cpt.paid,
      greatest(0, cpt.effective_sale_price - cpt.paid) as remaining,
      case
        when cpt.paid = 0 then 'unpaid'
        when cpt.paid >= cpt.effective_sale_price then 'cleared'
        else 'partial'
      end as payment_status
    from client_payment_totals cpt
  ),
  program_client_summary as (
    select
      cs.program_id,
      count(*)::integer as registered_count,
      (count(*) filter (where cs.payment_status = 'cleared'))::integer as cleared_count,
      (count(*) filter (where cs.payment_status = 'unpaid'))::integer as unpaid_count,
      (count(*) filter (where cs.payment_status = 'partial'))::integer as partial_count,
      coalesce(sum(cs.paid), 0)::numeric as total_paid,
      coalesce(sum(cs.remaining), 0)::numeric as remaining_total,
      (count(*) filter (where cs.remaining > 0))::integer as remaining_clients_count
    from client_statuses cs
    group by cs.program_id
  ),
  program_rows as (
    select
      ap.id as program_id,
      ap.name,
      ap.name_fr,
      ap.type,
      ap.duration,
      ap.departure,
      ap.return_date,
      ap.seats,
      ap.hotel_mecca,
      ap.hotel_madina,
      ap.status,
      coalesce(pcs.registered_count, 0)::integer as registered_count,
      coalesce(pcs.cleared_count, 0)::integer as cleared_count,
      coalesce(pcs.unpaid_count, 0)::integer as unpaid_count,
      coalesce(pcs.partial_count, 0)::integer as partial_count,
      coalesce(pcs.total_paid, 0)::numeric as total_paid,
      coalesce(pcs.remaining_total, 0)::numeric as remaining_total,
      pps.package_count,
      pps.starting_price,
      pps.primary_hotel_mecca,
      pps.primary_hotel_madina,
      (pps.package_count > 1) as has_multiple_packages,
      ap.seats as capacity,
      (ap.seats is not null and ap.seats > 0) as has_valid_capacity,
      case
        when ap.seats is not null and ap.seats > 0
          then least((coalesce(pcs.registered_count, 0)::numeric / ap.seats::numeric) * 100, 100::numeric)
        else 0
      end as capacity_pct,
      case
        when ap.seats is null or ap.seats <= 0 then 'unknown'
        when coalesce(pcs.registered_count, 0) >= ap.seats then 'full'
        else 'not_full'
      end as capacity_status,
      case
        when coalesce(pcs.registered_count, 0) = 0 then 'empty'
        when coalesce(pcs.remaining_clients_count, 0) = 0 then 'cleared'
        else 'not_cleared'
      end as payment_status,
      ap.type_kind,
      ap.year,
      ap.created_at as sort_created_at
    from active_programs ap
    join program_package_summary pps
      on pps.program_id = ap.id
    left join program_client_summary pcs
      on pcs.program_id = ap.id
  ),
  filtered_programs as (
    select *
    from program_rows
    where (
      safe_search = ''
      or position(safe_search in lower(coalesce(name, ''))) > 0
      or position(safe_search in lower(coalesce(name_fr, ''))) > 0
      or position(safe_search in lower(coalesce(type, ''))) > 0
      or position(safe_search in lower(coalesce(primary_hotel_mecca, ''))) > 0
      or position(safe_search in lower(coalesce(primary_hotel_madina, ''))) > 0
      or position(safe_search in lower(coalesce(hotel_mecca, ''))) > 0
      or position(safe_search in lower(coalesce(hotel_madina, ''))) > 0
      or position(safe_search in lower(coalesce(departure::text, ''))) > 0
      or position(safe_search in lower(coalesce(return_date::text, ''))) > 0
    )
      and (safe_year is null or year = safe_year)
      and (safe_type = 'all' or type_kind = safe_type)
      and (
        safe_status = 'all'
        or (safe_status in ('cleared', 'not_cleared') and payment_status = safe_status)
        or (safe_status in ('full', 'not_full') and capacity_status = safe_status)
      )
  ),
  total as (
    select count(*)::integer as total_count
    from filtered_programs
  ),
  page_items as (
    select *
    from filtered_programs
    order by sort_created_at asc nulls last, program_id asc
    limit safe_limit
    offset safe_offset
  )
  select jsonb_build_object(
    'items',
      coalesce(
        jsonb_agg(to_jsonb(page_items) - 'sort_created_at' order by page_items.sort_created_at asc nulls last, page_items.program_id asc),
        '[]'::jsonb
      ),
    'total_count', (select total_count from total),
    'limit', safe_limit,
    'offset', safe_offset,
    'search', safe_search,
    'year', safe_year,
    'type', safe_type,
    'status', safe_status
  )
  into result
  from page_items;

  return coalesce(
    result,
    jsonb_build_object(
      'items', '[]'::jsonb,
      'total_count', 0,
      'limit', safe_limit,
      'offset', safe_offset,
      'search', safe_search,
      'year', safe_year,
      'type', safe_type,
      'status', safe_status
    )
  );
end;
$$;

revoke all on function public.get_programs_page(text, integer, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_programs_page(text, integer, text, text, integer, integer) to authenticated;