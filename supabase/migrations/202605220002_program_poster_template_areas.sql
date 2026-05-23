-- DB-19: Program poster template fill-area mappings.
-- Do not run automatically. Review, then apply manually.
--
-- Scope:
-- - Adds lightweight JSON metadata for Phase 2 fill areas.
-- - Keeps existing templates valid with an empty area list.
-- - Does not modify storage, RLS, generated posters, or program flows.

alter table public.program_poster_templates
  add column if not exists areas jsonb not null default '[]'::jsonb;
