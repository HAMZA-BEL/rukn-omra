-- DB-03: Add role enforcement for tenant administration.
-- Do not run automatically. Apply manually after DB-02 has been reviewed/applied.

create or replace function public.has_agency_role(allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
      and u.agency_id = public.get_agency_id()
      and lower(u.role) in (
        select lower(trim(role_name))
        from unnest(coalesce(allowed_roles, array[]::text[])) as allowed(role_name)
      )
  )
$$;

revoke all on function public.has_agency_role(text[]) from public, anon;
grant execute on function public.has_agency_role(text[]) to authenticated;

-- Agency settings are sensitive tenant-level configuration.
drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_update" on public.agencies
  for update using (
    id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  )
  with check (
    id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );
