-- DB-18: Program poster template uploads.
-- Do not run automatically. Review, then apply manually.
--
-- Scope:
-- - Stores blank social poster template metadata for each agency.
-- - Stores uploaded blank poster images in a private agency-scoped bucket.
-- - Does not generate posters, add field mapping, or modify program flows.

create table if not exists public.program_poster_templates (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  name         text not null,
  program_type text not null check (program_type in ('umrah', 'hajj')),
  image_path   text not null,
  file_name    text,
  file_size    integer,
  created_by   uuid references auth.users(id) on delete set null,
  updated_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_program_poster_templates_agency_updated
  on public.program_poster_templates (agency_id, updated_at desc);

alter table public.program_poster_templates enable row level security;

create or replace function public.touch_program_poster_templates_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    if tg_op = 'INSERT' and new.created_by is null then
      new.created_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_program_poster_templates_updated_at on public.program_poster_templates;
create trigger trg_program_poster_templates_updated_at
before insert or update on public.program_poster_templates
for each row execute function public.touch_program_poster_templates_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-poster-templates',
  'program-poster-templates',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 12582912,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "program_poster_templates_storage_select" on storage.objects;
drop policy if exists "program_poster_templates_storage_insert" on storage.objects;
drop policy if exists "program_poster_templates_storage_update" on storage.objects;
drop policy if exists "program_poster_templates_storage_delete" on storage.objects;

create policy "program_poster_templates_storage_select" on storage.objects
  for select using (
    bucket_id = 'program-poster-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
  );

create policy "program_poster_templates_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'program-poster-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and public.has_agency_role(array['manager','owner','admin'])
  );

create policy "program_poster_templates_storage_update" on storage.objects
  for update using (
    bucket_id = 'program-poster-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and public.has_agency_role(array['manager','owner','admin'])
  )
  with check (
    bucket_id = 'program-poster-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and public.has_agency_role(array['manager','owner','admin'])
  );

create policy "program_poster_templates_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'program-poster-templates'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and public.has_agency_role(array['manager','owner','admin'])
  );

drop policy if exists "program_poster_templates_select" on public.program_poster_templates;
drop policy if exists "program_poster_templates_insert" on public.program_poster_templates;
drop policy if exists "program_poster_templates_update" on public.program_poster_templates;
drop policy if exists "program_poster_templates_delete" on public.program_poster_templates;

create policy "program_poster_templates_select" on public.program_poster_templates
  for select using (agency_id = public.get_agency_id());

create policy "program_poster_templates_insert" on public.program_poster_templates
  for insert with check (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['manager','owner','admin'])
  );

create policy "program_poster_templates_update" on public.program_poster_templates
  for update using (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['manager','owner','admin'])
  )
  with check (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['manager','owner','admin'])
  );

create policy "program_poster_templates_delete" on public.program_poster_templates
  for delete using (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['manager','owner','admin'])
  );
