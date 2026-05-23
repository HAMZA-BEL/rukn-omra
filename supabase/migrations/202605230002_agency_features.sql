-- DB-23: Agency-scoped feature flags.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Adds a tenant-level feature flag table for controlled feature rollout.
-- - The first feature key is: program_posters.
-- - Missing rows and disabled rows must be treated as disabled by the app.
-- - Normal agency users can read only their own flags and cannot write flags.

create table if not exists public.agency_features (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  feature_key text not null,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_features_agency_feature_key_unique'
      and conrelid = 'public.agency_features'::regclass
  ) then
    alter table public.agency_features
      add constraint agency_features_agency_feature_key_unique
      unique (agency_id, feature_key);
  end if;
end
$$;

create index if not exists idx_agency_features_agency_id
  on public.agency_features (agency_id);

create index if not exists idx_agency_features_feature_key
  on public.agency_features (feature_key);

create index if not exists idx_agency_features_agency_feature_key
  on public.agency_features (agency_id, feature_key);

create or replace function public.touch_agency_features_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agency_features_updated_at on public.agency_features;
create trigger trg_agency_features_updated_at
before update on public.agency_features
for each row execute function public.touch_agency_features_updated_at();

alter table public.agency_features enable row level security;

drop policy if exists "agency_features_select" on public.agency_features;

create policy "agency_features_select" on public.agency_features
  for select using (agency_id = public.get_agency_id());

