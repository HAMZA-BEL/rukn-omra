-- Paginated Trash list RPC.
-- Read-only: returns compact Trash rows for the caller's agency only.
-- Security-sensitive: this function never accepts agency_id from the frontend.
-- It resolves the active agency through public.get_agency_id().

create or replace function public.get_trash_page(
  p_item_type text default 'all',
  p_limit integer default 25,
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
  safe_item_type text;
  safe_limit integer;
  safe_offset integer;
  result jsonb;
begin
  current_agency_id := public.get_agency_id();

  safe_item_type := lower(coalesce(nullif(trim(p_item_type), ''), 'all'));
  if safe_item_type not in ('all', 'programs', 'clients', 'hajj', 'umrah', 'unassigned', 'payments', 'invoices') then
    safe_item_type := 'all';
  end if;

  safe_limit := least(100, greatest(1, coalesce(p_limit, 25)));
  safe_offset := greatest(0, coalesce(p_offset, 0));

  if current_agency_id is null then
    return jsonb_build_object(
      'items', '[]'::jsonb,
      'total_count', 0,
      'item_type', safe_item_type,
      'limit', safe_limit,
      'offset', safe_offset
    );
  end if;

  with all_items as (
    select
      'program'::text as item_type,
      p.id as item_id,
      null::text as client_id,
      null::text as client_kind,
      coalesce(nullif(trim(p.name), ''), p.id::text) as title,
      null::text as client_name,
      null::text as phone,
      null::text as city,
      null::numeric as amount,
      null::text as method,
      null::text as receipt_no,
      null::text as invoice_display_number,
      null::text as program_name,
      p.departure::text as departure,
      p.duration::text as duration,
      p.deleted_at as deleted_at,
      p.created_at as created_at,
      p.deleted_at as sort_deleted_at,
      p.created_at as sort_created_at,
      p.deleted_batch_id as deleted_batch_id,
      coalesce((
        select count(*)::integer
        from public.clients c
        where c.agency_id = current_agency_id
          and p.deleted_batch_id is not null
          and c.deleted_batch_id = p.deleted_batch_id
      ), 0)::integer as linked_count,
      coalesce(p.status, 'active') as status
    from public.programs p
    where p.agency_id = current_agency_id
      and coalesce(p.deleted, false) = true

    union all

    select
      'client'::text as item_type,
      c.id as item_id,
      c.id::text as client_id,
      case
        when kind_source.program_type_text like '%عمرة%' or kind_source.program_type_text like '%عمره%' or kind_source.program_type_text like '%umrah%' or kind_source.program_type_text like '%omra%' or kind_source.program_type_text like '%omrah%' then 'umrah'
        when kind_source.program_type_text like '%حج%' or kind_source.program_type_text like '%hajj%' or kind_source.program_type_text like '%hadj%' then 'hajj'
        when kind_source.program_name_text like '%عمرة%' or kind_source.program_name_text like '%عمره%' or kind_source.program_name_text like '%umrah%' or kind_source.program_name_text like '%omra%' or kind_source.program_name_text like '%omrah%' then 'umrah'
        when kind_source.program_name_text like '%حج%' or kind_source.program_name_text like '%hajj%' or kind_source.program_name_text like '%hadj%' then 'hajj'
        when kind_source.snapshot_type_text like '%عمرة%' or kind_source.snapshot_type_text like '%عمره%' or kind_source.snapshot_type_text like '%umrah%' or kind_source.snapshot_type_text like '%omra%' or kind_source.snapshot_type_text like '%omrah%' then 'umrah'
        when kind_source.snapshot_type_text like '%حج%' or kind_source.snapshot_type_text like '%hajj%' or kind_source.snapshot_type_text like '%hadj%' then 'hajj'
        when kind_source.snapshot_name_text like '%عمرة%' or kind_source.snapshot_name_text like '%عمره%' or kind_source.snapshot_name_text like '%umrah%' or kind_source.snapshot_name_text like '%omra%' or kind_source.snapshot_name_text like '%omrah%' then 'umrah'
        when kind_source.snapshot_name_text like '%حج%' or kind_source.snapshot_name_text like '%hajj%' or kind_source.snapshot_name_text like '%hadj%' then 'hajj'
        when kind_source.client_field_text like '%عمرة%' or kind_source.client_field_text like '%عمره%' or kind_source.client_field_text like '%umrah%' or kind_source.client_field_text like '%omra%' or kind_source.client_field_text like '%omrah%' then 'umrah'
        when kind_source.client_field_text like '%حج%' or kind_source.client_field_text like '%hajj%' or kind_source.client_field_text like '%hadj%' then 'hajj'
        else 'unassigned'
      end as client_kind,
      coalesce(
        nullif(trim(c.name), ''),
        nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
        nullif(trim(concat_ws(' / ', c.nom, c.prenom)), ''),
        c.id::text
      ) as title,
      coalesce(
        nullif(trim(c.name), ''),
        nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
        nullif(trim(concat_ws(' / ', c.nom, c.prenom)), ''),
        c.id::text
      ) as client_name,
      c.phone as phone,
      c.city as city,
      null::numeric as amount,
      null::text as method,
      null::text as receipt_no,
      null::text as invoice_display_number,
      pr.name as program_name,
      null::text as departure,
      null::text as duration,
      c.deleted_at as deleted_at,
      c.created_at as created_at,
      c.deleted_at as sort_deleted_at,
      c.created_at as sort_created_at,
      c.deleted_batch_id as deleted_batch_id,
      0::integer as linked_count,
      'deleted'::text as status
    from public.clients c
    left join public.programs pr
      on pr.agency_id = current_agency_id
     and pr.id = c.program_id
    left join lateral (
      select
        lower(concat_ws(' ', pr.type)) as program_type_text,
        lower(concat_ws(' ', pr.name)) as program_name_text,
        lower(concat_ws(
          ' ',
          c.docs->'deletedProgramSnapshot'->>'type',
          c.docs->'deletedProgramSnapshot'->>'programType',
          c.docs->'deletedProgramSnapshot'->>'program_type',
          c.docs->'deletedProgramSnapshot'->>'programKind',
          c.docs->'deletedProgramSnapshot'->>'programCategory',
          c.docs->'deletedProgramSnapshot'->>'program_category',
          c.docs->'deletedProgramSnapshot'->>'category'
        )) as snapshot_type_text,
        lower(concat_ws(
          ' ',
          c.docs->'deletedProgramSnapshot'->>'name',
          c.docs->'deletedProgramSnapshot'->>'programName',
          c.docs->'deletedProgramSnapshot'->>'programNameFr',
          c.docs->'deletedProgramSnapshot'->>'program_name'
        )) as snapshot_name_text,
        lower(concat_ws(
          ' ',
          c.docs->>'serviceType',
          c.docs->>'service_type',
          c.docs->>'type',
          c.docs->>'programType',
          c.docs->>'program_type',
          c.docs->>'programKind',
          c.docs->>'programName',
          c.docs->>'program_name',
          c.docs->'program'->>'type',
          c.docs->'program'->>'name'
        )) as client_field_text
    ) kind_source on true
    where c.agency_id = current_agency_id
      and coalesce(c.deleted, false) = true

    union all

    select
      'payment'::text as item_type,
      p.id as item_id,
      p.client_id::text as client_id,
      null::text as client_kind,
      coalesce(nullif(trim(p.receipt_no), ''), nullif(trim(p.legacy_receipt_number), ''), p.id::text) as title,
      coalesce(
        nullif(trim(c.name), ''),
        nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
        nullif(trim(concat_ws(' / ', c.nom, c.prenom)), ''),
        p.client_id::text
      ) as client_name,
      c.phone as phone,
      c.city as city,
      p.amount as amount,
      p.method as method,
      coalesce(nullif(trim(p.receipt_no), ''), nullif(trim(p.legacy_receipt_number), '')) as receipt_no,
      null::text as invoice_display_number,
      pr.name as program_name,
      null::text as departure,
      null::text as duration,
      coalesce(p.trashed_at, p.deleted_at, p.date::timestamp with time zone, p.created_at) as deleted_at,
      p.created_at as created_at,
      coalesce(p.trashed_at, p.deleted_at, p.date::timestamp with time zone, p.created_at) as sort_deleted_at,
      p.created_at as sort_created_at,
      null::uuid as deleted_batch_id,
      0::integer as linked_count,
      coalesce(p.status, 'active') as status
    from public.payments p
    left join public.clients c
      on c.agency_id = current_agency_id
     and c.id = p.client_id
    left join public.programs pr
      on pr.agency_id = current_agency_id
     and pr.id = c.program_id
    where p.agency_id = current_agency_id
      and coalesce(p.status, 'active') = 'trashed'

    union all

    select
      'invoice'::text as item_type,
      i.id as item_id,
      i.client_id as client_id,
      null::text as client_kind,
      case
        when i.recipient_type = 'company' then coalesce(nullif(trim(i.recipient_snapshot->>'companyName'), ''), nullif(trim(i.recipient_snapshot->>'name'), ''), i.invoice_display_number)
        else coalesce(nullif(trim(i.recipient_snapshot->>'clientName'), ''), nullif(trim(i.recipient_snapshot->>'name'), ''), i.invoice_display_number)
      end as title,
      coalesce(nullif(trim(i.recipient_snapshot->>'clientName'), ''), nullif(trim(i.recipient_snapshot->>'name'), ''), i.client_id) as client_name,
      null::text as phone,
      null::text as city,
      case
        when coalesce(i.amount_snapshot->>'total', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (i.amount_snapshot->>'total')::numeric
        when coalesce(i.amount_snapshot->>'grandTotal', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (i.amount_snapshot->>'grandTotal')::numeric
        else null::numeric
      end as amount,
      null::text as method,
      null::text as receipt_no,
      i.invoice_display_number as invoice_display_number,
      coalesce(nullif(trim(i.program_snapshot->>'programName'), ''), pr.name) as program_name,
      null::text as departure,
      null::text as duration,
      coalesce(i.trashed_at, i.deleted_at, i.issue_date::timestamp with time zone, i.created_at) as deleted_at,
      i.created_at as created_at,
      coalesce(i.trashed_at, i.deleted_at, i.issue_date::timestamp with time zone, i.created_at) as sort_deleted_at,
      i.created_at as sort_created_at,
      null::uuid as deleted_batch_id,
      0::integer as linked_count,
      coalesce(i.status, 'issued') as status
    from public.invoices i
    left join public.programs pr
      on pr.agency_id = current_agency_id
     and pr.id::text = i.program_id
    where i.agency_id = current_agency_id
      and coalesce(i.status, 'issued') = 'trashed'
  ),
  filtered as (
    select *
    from all_items
    where safe_item_type = 'all'
      or (safe_item_type = 'programs' and item_type = 'program')
      or (safe_item_type = 'clients' and item_type = 'client')
      or (safe_item_type = 'hajj' and item_type = 'client' and client_kind = 'hajj')
      or (safe_item_type = 'umrah' and item_type = 'client' and client_kind = 'umrah')
      or (safe_item_type = 'unassigned' and item_type = 'client' and client_kind = 'unassigned')
      or (safe_item_type = 'payments' and item_type = 'payment')
      or (safe_item_type = 'invoices' and item_type = 'invoice')
  ),
  paged as (
    select *
    from filtered
    order by sort_deleted_at desc nulls last, sort_created_at desc nulls last, item_type asc, item_id::text asc
    limit safe_limit
    offset safe_offset
  )
  select jsonb_build_object(
    'items',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_type', p.item_type,
          'item_id', p.item_id,
          'client_id', p.client_id,
          'client_kind', p.client_kind,
          'title', p.title,
          'client_name', p.client_name,
          'phone', p.phone,
          'city', p.city,
          'amount', p.amount,
          'method', p.method,
          'receipt_no', p.receipt_no,
          'invoice_display_number', p.invoice_display_number,
          'program_name', p.program_name,
          'departure', p.departure,
          'duration', p.duration,
          'deleted_at', p.deleted_at,
          'created_at', p.created_at,
          'deleted_batch_id', p.deleted_batch_id,
          'linked_count', p.linked_count,
          'status', p.status
        )
        order by p.sort_deleted_at desc nulls last, p.sort_created_at desc nulls last, p.item_type asc, p.item_id::text asc
      ),
      '[]'::jsonb
    ),
    'total_count', (select count(*) from filtered),
    'item_type', safe_item_type,
    'limit', safe_limit,
    'offset', safe_offset
  )
  into result
  from paged p;

  return result;
end;
$$;

revoke all on function public.get_trash_page(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_trash_page(text, integer, integer) to authenticated;
