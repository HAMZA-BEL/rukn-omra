-- Batched Trash preflight related-record counts for deleted clients.
-- Read-only RPC used by the Trash page to avoid one dry-run function call per client.
-- Final permanent deletion remains protected by the Netlify permanent-delete-client function.

create or replace function public.get_deleted_client_related_counts(
  p_agency_id uuid,
  p_client_ids uuid[]
)
returns table (
  client_id uuid,
  payments_count integer,
  active_payments_count integer,
  inactive_payments_count integer,
  invoices_count integer,
  active_invoices_count integer,
  inactive_invoices_count integer,
  final_invoices_count integer,
  notifications_count integer,
  representation_links_count integer,
  rooming_references_count integer,
  has_badge_photo boolean,
  can_permanent_delete boolean,
  block_reason text,
  reason_key text
)
language sql
stable
security definer
set search_path = public
as $$
  with active_agency as (
    select public.get_agency_id() as agency_id
  ),
  requested as (
    select distinct input.client_id
    from unnest(coalesce(p_client_ids, array[]::uuid[])) as input(client_id)
    where input.client_id is not null
  ),
  eligible as (
    select
      c.id as client_id,
      c.docs
    from public.clients c
    join requested r on r.client_id = c.id
    join active_agency aa on aa.agency_id = p_agency_id
    where c.agency_id = p_agency_id
      and coalesce(c.deleted, false) = true
  ),
  payment_counts as (
    select
      p.client_id,
      count(*) filter (
        where p.agency_id = p_agency_id
      )::integer as payments_count,
      count(*) filter (
        where p.agency_id = p_agency_id
          and p.trashed_at is null
          and p.deleted_at is null
          and lower(coalesce(p.status, 'active')) not in ('trashed', 'deleted', 'inactive', 'archived', 'void', 'cancelled', 'canceled')
      )::integer as active_payments_count,
      count(*) filter (
        where p.agency_id = p_agency_id
          and (
            p.trashed_at is not null
            or p.deleted_at is not null
            or lower(coalesce(p.status, 'active')) in ('trashed', 'deleted', 'inactive', 'archived', 'void', 'cancelled', 'canceled')
          )
      )::integer as inactive_payments_count,
      count(*) filter (
        where p.agency_id is distinct from p_agency_id
      )::integer as hidden_payments_count
    from public.payments p
    join eligible e on e.client_id = p.client_id
    group by p.client_id
  ),
  invoice_counts as (
    -- public.invoices stores issued final invoices. Proforma/preliminary
    -- documents are print-only in the app and are not persisted here.
    select
      e.client_id,
      count(i.id) filter (
        where i.agency_id = p_agency_id
      )::integer as invoices_count,
      count(i.id) filter (
        where i.agency_id = p_agency_id
          and i.trashed_at is null
          and i.deleted_at is null
          and lower(coalesce(i.status, 'issued')) not in ('trashed', 'deleted', 'void', 'cancelled', 'canceled')
      )::integer as active_invoices_count,
      count(i.id) filter (
        where i.agency_id = p_agency_id
          and (
            i.trashed_at is not null
            or i.deleted_at is not null
            or lower(coalesce(i.status, 'issued')) in ('trashed', 'deleted', 'void', 'cancelled', 'canceled')
          )
      )::integer as inactive_invoices_count,
      count(i.id) filter (
        where i.agency_id = p_agency_id
          and i.trashed_at is null
          and i.deleted_at is null
          and lower(coalesce(i.status, 'issued')) not in ('trashed', 'deleted', 'void', 'cancelled', 'canceled')
      )::integer as final_invoices_count,
      count(i.id) filter (
        where i.agency_id is distinct from p_agency_id
          and i.trashed_at is null
          and i.deleted_at is null
          and lower(coalesce(i.status, 'issued')) not in ('trashed', 'deleted', 'void', 'cancelled', 'canceled')
      )::integer as hidden_invoices_count
    from eligible e
    join public.invoices i
      on i.client_id = e.client_id::text
    group by e.client_id
  ),
  representation_counts as (
    select
      e.client_id,
      count(c.id)::integer as representation_links_count
    from eligible e
    join public.clients c
      on c.agency_id = p_agency_id
     and c.represented_by_client_id = e.client_id
    group by e.client_id
  ),
  notification_counts as (
    select
      e.client_id,
      count(n.id)::integer as notifications_count
    from eligible e
    join public.notifications n
      on n.agency_id = p_agency_id
     and n.target_type = 'client'
     and n.target_id::text = e.client_id::text
    group by e.client_id
  ),
  rooming_counts as (
    select
      e.client_id,
      count(distinct ra.id)::integer as rooming_references_count
    from eligible e
    join public.rooming_assignments ra
      on ra.agency_id = p_agency_id
     and (
       ra.rooms::text like ('%' || e.client_id::text || '%')
       or ra.unassigned::text like ('%' || e.client_id::text || '%')
     )
    group by e.client_id
  ),
  summarized as (
    select
      e.client_id,
      coalesce(pc.payments_count, 0)::integer as payments_count,
      coalesce(pc.active_payments_count, 0)::integer as active_payments_count,
      coalesce(pc.inactive_payments_count, 0)::integer as inactive_payments_count,
      coalesce(pc.hidden_payments_count, 0)::integer as hidden_payments_count,
      coalesce(ic.invoices_count, 0)::integer as invoices_count,
      coalesce(ic.active_invoices_count, 0)::integer as active_invoices_count,
      coalesce(ic.inactive_invoices_count, 0)::integer as inactive_invoices_count,
      coalesce(ic.final_invoices_count, 0)::integer as final_invoices_count,
      coalesce(ic.hidden_invoices_count, 0)::integer as hidden_invoices_count,
      coalesce(nc.notifications_count, 0)::integer as notifications_count,
      coalesce(rc.representation_links_count, 0)::integer as representation_links_count,
      coalesce(rmc.rooming_references_count, 0)::integer as rooming_references_count,
      nullif(trim(coalesce(e.docs->>'badgePhotoPath', '')), '') is not null as has_badge_photo
    from eligible e
    left join payment_counts pc on pc.client_id = e.client_id
    left join invoice_counts ic on ic.client_id = e.client_id
    left join notification_counts nc on nc.client_id = e.client_id
    left join representation_counts rc on rc.client_id = e.client_id
    left join rooming_counts rmc on rmc.client_id = e.client_id
  )
  select
    s.client_id,
    s.payments_count,
    s.active_payments_count,
    s.inactive_payments_count,
    s.invoices_count,
    s.active_invoices_count,
    s.inactive_invoices_count,
    s.final_invoices_count,
    s.notifications_count,
    s.representation_links_count,
    s.rooming_references_count,
    s.has_badge_photo,
    not (
      s.active_payments_count > 0
      or s.final_invoices_count > 0
      or s.hidden_payments_count > 0
      or s.hidden_invoices_count > 0
    ) as can_permanent_delete,
    case
      when s.active_payments_count > 0 and s.final_invoices_count > 0 then 'ACTIVE_LINKED_FINANCIAL_RECORDS'
      when s.active_payments_count > 0 then 'ACTIVE_LINKED_PAYMENTS'
      when s.final_invoices_count > 0 then 'ACTIVE_LINKED_INVOICES'
      when s.hidden_payments_count > 0 and s.hidden_invoices_count > 0 then 'UNKNOWN_LINKED_RECORDS'
      when s.hidden_payments_count > 0 then 'LINKED_EXTERNAL_PAYMENTS'
      when s.hidden_invoices_count > 0 then 'LINKED_EXTERNAL_INVOICES'
      when (
        s.inactive_payments_count
        + s.inactive_invoices_count
        + s.notifications_count
        + s.representation_links_count
        + s.rooming_references_count
        + case when s.has_badge_photo then 1 else 0 end
      ) > 0 then 'DELETE_LINKED_RECORDS_AFTER_CONFIRMATION'
      else ''
    end as block_reason,
    case
      when s.active_payments_count > 0 and s.final_invoices_count > 0 then 'active_financial_records'
      when s.active_payments_count > 0 then 'active_payments'
      when s.final_invoices_count > 0 then 'final_invoices'
      when s.hidden_payments_count > 0 and s.hidden_invoices_count > 0 then 'hidden_financial_records'
      when s.hidden_payments_count > 0 then 'hidden_payments'
      when s.hidden_invoices_count > 0 then 'hidden_invoices'
      when (
        s.inactive_payments_count
        + s.inactive_invoices_count
        + s.notifications_count
        + s.representation_links_count
        + s.rooming_references_count
        + case when s.has_badge_photo then 1 else 0 end
      ) > 0 then 'safe_cleanup'
      else ''
    end as reason_key
  from summarized s;
$$;

revoke all on function public.get_deleted_client_related_counts(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_deleted_client_related_counts(uuid, uuid[]) to authenticated;
