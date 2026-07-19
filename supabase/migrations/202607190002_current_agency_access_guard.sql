-- Apply manually after 202607190001_secure_owner_agency_mutations.sql.
-- This does not change tenant RLS. It exposes only the signed-in user's agency identity and lifecycle status.

create or replace function public.get_current_agency_access_snapshot()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id', a.id,
    'name_ar', a.name_ar,
    'name_fr', a.name_fr,
    'status', a.status
  )
  from public.users u
  join public.agencies a on a.id = u.agency_id
  where u.id = auth.uid()
    and u.status = 'active'
  limit 1
$$;

revoke all on function public.get_current_agency_access_snapshot() from public, anon;
grant execute on function public.get_current_agency_access_snapshot() to authenticated;
