-- DB-02: Only active users can resolve an agency for tenant RLS.
-- Do not run automatically. Apply manually after reviewing in Supabase SQL Editor.

create or replace function public.get_agency_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select agency_id
  from public.users
  where id = auth.uid()
    and status = 'active'
  limit 1
$$;

revoke all on function public.get_agency_id() from public, anon;
grant execute on function public.get_agency_id() to authenticated;

create or replace function public.activate_own_invited_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.users
  set status = 'active',
      updated_at = now()
  where id = auth.uid()
    and status = 'invited';
end;
$$;

revoke all on function public.activate_own_invited_user() from public, anon, authenticated;
grant execute on function public.activate_own_invited_user() to authenticated;
