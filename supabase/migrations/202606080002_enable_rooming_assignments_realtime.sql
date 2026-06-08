-- Enable Supabase Realtime events for rooming assignment rows.
-- Rooming remains scoped in application code and RLS by agency_id, program_id, and location.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooming_assignments'
  ) then
    alter publication supabase_realtime add table public.rooming_assignments;
  end if;
end $$;
