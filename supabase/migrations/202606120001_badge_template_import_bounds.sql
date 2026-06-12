-- Badge template import/bounds support.
-- Keeps imported background/crop data DB-safe and allows decimal badge sizes.

alter table if exists public.badge_templates
  alter column width_mm type numeric using width_mm::numeric,
  alter column height_mm type numeric using height_mm::numeric;

alter table if exists public.badge_templates
  add column if not exists background_transform jsonb not null default '{}'::jsonb;

alter table if exists public.badge_templates
  add column if not exists thumbnail_path text;

grant select, insert, update, delete on table public.badge_templates to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table if exists public.badge_templates enable row level security;

drop policy if exists "badge_templates_select" on public.badge_templates;
drop policy if exists "badge_templates_insert" on public.badge_templates;
drop policy if exists "badge_templates_update" on public.badge_templates;
drop policy if exists "badge_templates_delete" on public.badge_templates;

create policy "badge_templates_select" on public.badge_templates
  for select using (agency_id = public.get_agency_id());

create policy "badge_templates_insert" on public.badge_templates
  for insert with check (agency_id = public.get_agency_id());

create policy "badge_templates_update" on public.badge_templates
  for update using (agency_id = public.get_agency_id())
  with check (agency_id = public.get_agency_id());

create policy "badge_templates_delete" on public.badge_templates
  for delete using (agency_id = public.get_agency_id());
