-- Dashboard Summary RPC v1.
-- Security-sensitive: this function never accepts agency_id from the frontend.
-- It resolves the caller's agency through public.get_agency_id(), which only
-- returns an agency for active authenticated users.

create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_agency_id uuid;
  empty_summary jsonb;
  summary jsonb;
begin
  empty_summary := jsonb_build_object(
    'active_programs_count', 0,
    'active_clients_count', 0,
    'hajj_clients_count', 0,
    'umrah_clients_count', 0,
    'total_paid', 0,
    'total_sales_amount', 0,
    'expected_total', 0,
    'total_remaining', 0,
    'total_discount', 0,
    'unpaid_count', 0,
    'partial_paid_count', 0,
    'fully_paid_count', 0,
    'cleared_count', 0,
    'incomplete_info_count', 0,
    'unread_notifications_count', 0,
    'program_client_counts', '{}'::jsonb
  );

  current_agency_id := public.get_agency_id();

  if current_agency_id is null then
    return empty_summary;
  end if;

  with active_programs as (
    select
      p.id,
      p.type,
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
        else null
      end as program_kind
    from public.programs p
    where p.agency_id = current_agency_id
      and coalesce(p.deleted, false) = false
  ),
  active_clients as (
    select
      c.id,
      c.program_id,
      coalesce(c.official_price, 0) as official_price,
      coalesce(c.sale_price, 0) as sale_price
    from public.clients c
    where c.agency_id = current_agency_id
      and coalesce(c.deleted, false) = false
      and coalesce(c.archived, false) = false
  ),
  client_payment_totals as (
    select
      c.id,
      c.program_id,
      c.official_price,
      c.sale_price,
      coalesce(sum(coalesce(p.amount, 0)), 0) as paid
    from active_clients c
    left join public.payments p
      on p.agency_id = current_agency_id
      and p.client_id = c.id
      and coalesce(p.status, 'active') = 'active'
    group by c.id, c.program_id, c.official_price, c.sale_price
  ),
  program_client_counts as (
    select
      c.program_id,
      count(*) as client_count
    from active_clients c
    where c.program_id is not null
    group by c.program_id
  ),
  totals as (
    select
      count(*) as active_clients_count,
      coalesce(sum(c.paid), 0) as total_paid,
      coalesce(sum(c.sale_price), 0) as total_sales_amount,
      coalesce(sum(greatest(0, c.sale_price - c.paid)), 0) as total_remaining,
      coalesce(sum(greatest(0, c.official_price - c.sale_price)), 0) as total_discount,
      count(*) filter (where c.paid = 0) as unpaid_count,
      count(*) filter (where c.paid <> 0 and c.paid < c.sale_price) as partial_paid_count,
      count(*) filter (where c.paid <> 0 and c.paid >= c.sale_price) as fully_paid_count,
      count(*) filter (where ap.program_kind = 'hajj') as hajj_clients_count,
      count(*) filter (where ap.program_kind = 'umrah') as umrah_clients_count
    from client_payment_totals c
    left join active_programs ap
      on ap.id = c.program_id
  )
  select jsonb_build_object(
    'active_programs_count',
      (select count(*) from active_programs),
    'active_clients_count',
      coalesce(t.active_clients_count, 0),
    'hajj_clients_count',
      coalesce(t.hajj_clients_count, 0),
    'umrah_clients_count',
      coalesce(t.umrah_clients_count, 0),
    'total_paid',
      coalesce(t.total_paid, 0),
    'total_sales_amount',
      coalesce(t.total_sales_amount, 0),
    'expected_total',
      coalesce(t.total_sales_amount, 0),
    'total_remaining',
      coalesce(t.total_remaining, 0),
    'total_discount',
      coalesce(t.total_discount, 0),
    'unpaid_count',
      coalesce(t.unpaid_count, 0),
    'partial_paid_count',
      coalesce(t.partial_paid_count, 0),
    'fully_paid_count',
      coalesce(t.fully_paid_count, 0),
    'cleared_count',
      coalesce(t.fully_paid_count, 0),
    'incomplete_info_count',
      0,
    'unread_notifications_count',
      (
        select count(*)
        from public.notifications n
        where n.agency_id = current_agency_id
          and coalesce(n.is_archived, false) = false
          and coalesce(n.is_read, false) = false
      ),
    'program_client_counts',
      coalesce(
        (
          select jsonb_object_agg(program_id::text, client_count)
          from program_client_counts
        ),
        '{}'::jsonb
      )
  )
  into summary
  from totals t;

  return coalesce(summary, empty_summary);
end;
$$;

revoke all on function public.get_dashboard_summary() from public, anon, authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
