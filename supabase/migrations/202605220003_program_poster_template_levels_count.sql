-- DB-20: Program poster template levels count metadata.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Adds the number of program package/price levels a blank poster template is designed for.
-- - This prepares Phase 3 automatic template matching by program_type + levels_count.
-- - Does not generate posters, add Program Actions, or modify RLS policies.

alter table public.program_poster_templates
  add column if not exists levels_count integer not null default 3;

alter table public.program_poster_templates
  drop constraint if exists program_poster_templates_levels_count_check;

alter table public.program_poster_templates
  add constraint program_poster_templates_levels_count_check
  check (levels_count between 1 and 5);
