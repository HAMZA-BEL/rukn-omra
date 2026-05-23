-- DB-22: Structured ordered program travel route stops.
-- Do not run automatically. Review, then apply manually in Supabase.
--
-- Scope:
-- - Preserves each outbound and return route stop as an ordered JSON array.
-- - Keeps existing route text columns for backward compatibility and poster display fallback.
-- - Does not modify RLS policies.

alter table public.programs
  add column if not exists outbound_route_stops jsonb not null default '[]'::jsonb;

alter table public.programs
  add column if not exists return_route_stops jsonb not null default '[]'::jsonb;

