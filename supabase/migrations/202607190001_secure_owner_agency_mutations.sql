-- Apply manually after 202606130001_owner_console_security_foundation.sql.
-- All statements are transactional when applied as one migration.

create or replace function public.get_current_agency_access_status()
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select a.status
  from public.users u
  join public.agencies a on a.id = u.agency_id
  where u.id = auth.uid()
    and u.status = 'active'
  limit 1
$$;

revoke all on function public.get_current_agency_access_status() from public, anon;
grant execute on function public.get_current_agency_access_status() to authenticated;

create or replace function public.admin_create_agency(
  p_name_ar text default null,
  p_name_fr text default null,
  p_agency_city text default null,
  p_email text default null,
  p_website text default null,
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agency public.agencies%rowtype;
  v_name_ar text := nullif(btrim(coalesce(p_name_ar, '')), '');
  v_name_fr text := nullif(btrim(coalesce(p_name_fr, '')), '');
begin
  if auth.role() <> 'service_role' and not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if v_name_ar is null and v_name_fr is null then
    raise exception 'agency_name_required' using errcode = '22023';
  end if;
  if lower(btrim(coalesce(p_status, 'active'))) <> 'active' then
    raise exception 'new_agency_must_be_active' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_create_agency_names', 0));
  if exists (
    select 1 from public.agencies a
    where (v_name_ar is not null and lower(btrim(a.name_ar)) = lower(v_name_ar))
       or (v_name_fr is not null and lower(btrim(a.name_fr)) = lower(v_name_fr))
  ) then
    raise exception 'agency_name_already_exists' using errcode = '23505';
  end if;

  insert into public.agencies (name_ar, name_fr, agency_city, email, website, status)
  values (
    v_name_ar, v_name_fr,
    nullif(btrim(coalesce(p_agency_city, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    'active'
  ) returning * into v_agency;

  insert into public.agency_features (agency_id, feature_key, enabled)
  values
    (v_agency.id, 'badges', true),
    (v_agency.id, 'contracts', true),
    (v_agency.id, 'program_posters', true),
    (v_agency.id, 'advanced_reports', false),
    (v_agency.id, 'api_access', false),
    (v_agency.id, 'hajj_module', true),
    (v_agency.id, 'nusuk_upload', false);

  insert into public.owner_audit_log (
    performed_by, action, target_type, target_id, agency_id, new_values
  ) values (
    auth.uid(), 'agency.created', 'agency', v_agency.id, v_agency.id,
    jsonb_build_object('id', v_agency.id, 'name_ar', v_agency.name_ar, 'name_fr', v_agency.name_fr, 'status', v_agency.status)
  );

  return v_agency.id;
end;
$$;

create or replace function public.admin_set_agency_status(
  p_agency_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_old jsonb;
  v_new jsonb;
begin
  if auth.role() <> 'service_role' and not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if v_status not in ('active', 'suspended', 'archived') then
    raise exception 'invalid_agency_status' using errcode = '22023';
  end if;

  select to_jsonb(a) into v_old from public.agencies a where a.id = p_agency_id;
  if v_old is null then
    raise exception 'agency_not_found' using errcode = 'P0002';
  end if;

  update public.agencies
  set status = v_status,
      suspended_at = case when v_status = 'suspended' then coalesce(suspended_at, now()) else null end,
      suspended_by = case when v_status = 'suspended' then auth.uid() else null end,
      suspension_reason = case when v_status = 'suspended' then nullif(btrim(coalesce(p_reason, '')), '') else null end,
      archived_at = case when v_status = 'archived' then coalesce(archived_at, now()) else null end,
      archived_by = case when v_status = 'archived' then auth.uid() else null end
  where id = p_agency_id
  returning jsonb_build_object(
    'id', id, 'status', status, 'suspended_at', suspended_at,
    'suspension_reason', suspension_reason, 'archived_at', archived_at
  ) into v_new;

  insert into public.owner_audit_log (
    performed_by, action, target_type, target_id, agency_id, old_values, new_values, metadata
  ) values (
    auth.uid(), 'agency.status.updated', 'agency', p_agency_id, p_agency_id,
    v_old, v_new, jsonb_build_object('reason', p_reason)
  );
  return v_new;
end;
$$;

create or replace function public.admin_set_agency_feature(
  p_agency_id uuid,
  p_feature_key text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_feature_key text := lower(btrim(coalesce(p_feature_key, '')));
  v_new jsonb;
begin
  if auth.role() <> 'service_role' and not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if v_feature_key not in (
    'badges', 'contracts', 'program_posters', 'advanced_reports',
    'api_access', 'hajj_module', 'nusuk_upload'
  ) then
    raise exception 'invalid_feature_key' using errcode = '22023';
  end if;
  if not exists (select 1 from public.agencies where id = p_agency_id) then
    raise exception 'agency_not_found' using errcode = 'P0002';
  end if;

  insert into public.agency_features (agency_id, feature_key, enabled)
  values (p_agency_id, v_feature_key, coalesce(p_enabled, false))
  on conflict (agency_id, feature_key)
  do update set enabled = excluded.enabled, updated_at = now()
  returning jsonb_build_object(
    'agency_id', agency_id, 'feature_key', feature_key, 'enabled', enabled
  ) into v_new;
  return v_new;
end;
$$;

revoke all on function public.admin_create_agency(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_agency_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_agency_feature(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_create_agency(text, text, text, text, text, text) to service_role;
grant execute on function public.admin_set_agency_status(uuid, text, text) to service_role;
grant execute on function public.admin_set_agency_feature(uuid, text, boolean) to service_role;
grant execute on function public.admin_list_agencies(text, text, integer, integer) to service_role;
