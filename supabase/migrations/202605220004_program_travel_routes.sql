-- DB-21: Optional program travel route text for poster generation.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Stores compact outbound and return route text without adding many city columns.
-- - Allows a custom poster display route when the automatic route text is not enough.
-- - Does not modify RLS policies.

alter table public.programs
  add column if not exists outbound_route_text text;

alter table public.programs
  add column if not exists return_route_text text;

alter table public.programs
  add column if not exists poster_travel_route text;

