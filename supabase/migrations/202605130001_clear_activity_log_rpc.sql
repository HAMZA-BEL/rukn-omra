-- Activity Log cleanup RPC.
-- Apply manually in Supabase SQL Editor if /rest/v1/rpc/clear_activity_log returns 404.
-- Security: the function never accepts agency_id from the frontend. It resolves
-- the caller's agency with public.get_agency_id() and permanently deletes only
-- that agency's matching active activity_log rows.

create or replace function public.clear_activity_log(days_threshold integer default 0)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  current_agency_id uuid;
  safe_days integer;
begin
  current_agency_id := public.get_agency_id();

  if current_agency_id is null then
    return 0;
  end if;

  safe_days := greatest(coalesce(days_threshold, 0), 0);

  delete from public.activity_log
  where agency_id = current_agency_id
    and created_at < now() - make_interval(days => safe_days);

  get diagnostics deleted_count = row_count;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.clear_activity_log(integer) from public, anon;
grant execute on function public.clear_activity_log(integer) to authenticated;
