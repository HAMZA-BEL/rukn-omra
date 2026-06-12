-- Lightweight badge template thumbnails for fast template list rendering.

alter table if exists public.badge_templates
  add column if not exists thumbnail_path text;

grant select, insert, update, delete on table public.badge_templates to authenticated;
