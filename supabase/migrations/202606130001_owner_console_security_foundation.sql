-- Owner Console security foundation.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Adds system owner identity, agency lifecycle status fields, and owner audit logging.
-- - Updates tenant agency resolution so suspended/archived agencies cannot resolve active tenancy.
-- - Adds explicit SECURITY DEFINER admin RPCs for platform-level owner-console operations.
-- - Does not add broad cross-agency RLS policies. Admin access must go through RPCs.

create table if not exists public.system_admins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'support', 'readonly')),
  status       text not null default 'active' check (status in ('active', 'disabled')),
  added_by     uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (user_id)
);

alter table public.system_admins enable row level security;

drop policy if exists "system_admins_select_own" on public.system_admins;
create policy "system_admins_select_own" on public.system_admins
  for select
  using (user_id = auth.uid());

revoke all on public.system_admins from public, anon, authenticated;
grant select on public.system_admins to authenticated;

create or replace function public.is_system_owner()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.system_admins sa
    where sa.user_id = auth.uid()
      and sa.status = 'active'
      and sa.role in ('owner', 'support')
  )
$$;

revoke all on function public.is_system_owner() from public, anon, authenticated;
grant execute on function public.is_system_owner() to authenticated;

alter table public.agencies
  add column if not exists status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid,
  add column if not exists suspension_reason text,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

update public.agencies
set status = 'active'
where status is null;

alter table public.agencies
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agencies_status_check'
      and conrelid = 'public.agencies'::regclass
  ) then
    alter table public.agencies
      add constraint agencies_status_check
      check (status in ('active', 'suspended', 'archived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agencies_suspended_by_fkey'
      and conrelid = 'public.agencies'::regclass
  ) then
    alter table public.agencies
      add constraint agencies_suspended_by_fkey
      foreign key (suspended_by) references auth.users(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agencies_archived_by_fkey'
      and conrelid = 'public.agencies'::regclass
  ) then
    alter table public.agencies
      add constraint agencies_archived_by_fkey
      foreign key (archived_by) references auth.users(id);
  end if;
end
$$;

create or replace function public.get_agency_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select u.agency_id
  from public.users u
  join public.agencies a on a.id = u.agency_id
  where u.id = auth.uid()
    and u.status = 'active'
    and a.status = 'active'
  limit 1
$$;

revoke all on function public.get_agency_id() from public, anon;
grant execute on function public.get_agency_id() to authenticated;

create table if not exists public.owner_audit_log (
  id           uuid primary key default gen_random_uuid(),
  performed_by uuid references auth.users(id),
  action       text not null,
  target_type  text not null,
  target_id    uuid,
  agency_id    uuid references public.agencies(id),
  old_values   jsonb not null default '{}'::jsonb,
  new_values   jsonb not null default '{}'::jsonb,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_owner_audit_log_created_at
  on public.owner_audit_log (created_at desc);

create index if not exists idx_owner_audit_log_agency_id
  on public.owner_audit_log (agency_id);

alter table public.owner_audit_log enable row level security;

drop policy if exists "owner_audit_log_select_system_owner" on public.owner_audit_log;
create policy "owner_audit_log_select_system_owner" on public.owner_audit_log
  for select
  using (public.is_system_owner());

revoke all on public.owner_audit_log from public, anon, authenticated;
grant select on public.owner_audit_log to authenticated;

create or replace function public.admin_get_owner_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'agencies', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active'),
        'suspended', count(*) filter (where status = 'suspended'),
        'archived', count(*) filter (where status = 'archived')
      )
      from public.agencies
    ),
    'features', (
      select jsonb_build_object(
        'totalConfigured', count(*),
        'enabled', count(*) filter (where enabled),
        'disabled', count(*) filter (where not enabled)
      )
      from public.agency_features
    ),
    'auditLog', (
      select jsonb_build_object(
        'total', count(*),
        'lastActionAt', max(created_at)
      )
      from public.owner_audit_log
    )
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_list_agencies(
  p_status text default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  name_ar text,
  name_fr text,
  agency_city text,
  email text,
  website text,
  status text,
  created_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  archived_at timestamptz,
  enabled_features_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('active', 'suspended', 'archived') then
    raise exception 'invalid_agency_status' using errcode = '22023';
  end if;

  return query
  select
    a.id,
    a.name_ar,
    a.name_fr,
    a.agency_city,
    a.email,
    a.website,
    a.status,
    a.created_at,
    a.suspended_at,
    a.suspension_reason,
    a.archived_at,
    coalesce(f.enabled_features_count, 0)::bigint as enabled_features_count
  from public.agencies a
  left join (
    select agency_id, count(*) filter (where enabled) as enabled_features_count
    from public.agency_features
    group by agency_id
  ) f on f.agency_id = a.id
  where (v_status is null or a.status = v_status)
    and (
      v_search is null
      or a.name_ar ilike '%' || v_search || '%'
      or a.name_fr ilike '%' || v_search || '%'
      or a.agency_city ilike '%' || v_search || '%'
      or a.email ilike '%' || v_search || '%'
    )
  order by a.created_at desc, a.name_ar asc
  limit v_limit
  offset v_offset;
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
  if not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_status not in ('active', 'suspended', 'archived') then
    raise exception 'invalid_agency_status' using errcode = '22023';
  end if;

  select to_jsonb(row_data)
  into v_old
  from (
    select
      id,
      name_ar,
      name_fr,
      status,
      suspended_at,
      suspended_by,
      suspension_reason,
      archived_at,
      archived_by
    from public.agencies
    where id = p_agency_id
  ) row_data;

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
  where id = p_agency_id;

  select to_jsonb(row_data)
  into v_new
  from (
    select
      id,
      name_ar,
      name_fr,
      status,
      suspended_at,
      suspended_by,
      suspension_reason,
      archived_at,
      archived_by
    from public.agencies
    where id = p_agency_id
  ) row_data;

  insert into public.owner_audit_log (
    performed_by,
    action,
    target_type,
    target_id,
    agency_id,
    old_values,
    new_values,
    metadata
  )
  values (
    auth.uid(),
    'agency.status.updated',
    'agency',
    p_agency_id,
    p_agency_id,
    coalesce(v_old, '{}'::jsonb),
    coalesce(v_new, '{}'::jsonb),
    jsonb_build_object('reason', p_reason)
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
  v_feature_key text := nullif(btrim(coalesce(p_feature_key, '')), '');
  v_old jsonb;
  v_new jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_feature_key is null
    or v_feature_key not in (
      'program_posters',
      'badges',
      'contracts',
      'marketplace',
      'advanced_reports',
      'hajj_module',
      'api_access'
    ) then
    raise exception 'invalid_feature_key' using errcode = '22023';
  end if;

  if not exists (select 1 from public.agencies where id = p_agency_id) then
    raise exception 'agency_not_found' using errcode = 'P0002';
  end if;

  select to_jsonb(row_data)
  into v_old
  from (
    select
      agency_id,
      feature_key,
      enabled,
      created_at,
      updated_at
    from public.agency_features
    where agency_id = p_agency_id
      and feature_key = v_feature_key
  ) row_data;

  with upserted as (
    insert into public.agency_features (agency_id, feature_key, enabled)
    values (p_agency_id, v_feature_key, coalesce(p_enabled, false))
    on conflict (agency_id, feature_key)
    do update
      set enabled = excluded.enabled,
          updated_at = now()
    returning agency_id, feature_key, enabled, created_at, updated_at
  )
  select to_jsonb(upserted)
  into v_new
  from upserted;

  insert into public.owner_audit_log (
    performed_by,
    action,
    target_type,
    target_id,
    agency_id,
    old_values,
    new_values,
    metadata
  )
  values (
    auth.uid(),
    'agency.feature.updated',
    'agency_feature',
    p_agency_id,
    p_agency_id,
    coalesce(v_old, '{}'::jsonb),
    coalesce(v_new, '{}'::jsonb),
    jsonb_build_object('featureKey', v_feature_key)
  );

  return v_new;
end;
$$;

create or replace function public.admin_get_audit_log(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  performed_by uuid,
  action text,
  target_type text,
  target_id uuid,
  agency_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_system_owner() then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return query
  select
    oal.id,
    oal.performed_by,
    oal.action,
    oal.target_type,
    oal.target_id,
    oal.agency_id,
    oal.old_values,
    oal.new_values,
    oal.metadata,
    oal.created_at
  from public.owner_audit_log oal
  order by oal.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.admin_get_owner_dashboard_stats() from public, anon, authenticated;
revoke all on function public.admin_list_agencies(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_set_agency_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_agency_feature(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_get_audit_log(integer, integer) from public, anon, authenticated;

grant execute on function public.admin_get_owner_dashboard_stats() to authenticated;
grant execute on function public.admin_list_agencies(text, text, integer, integer) to authenticated;
grant execute on function public.admin_set_agency_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_agency_feature(uuid, text, boolean) to authenticated;
grant execute on function public.admin_get_audit_log(integer, integer) to authenticated;
