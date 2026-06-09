-- Enable Supabase Realtime events for programs.
-- Program rows remain agency-scoped by RLS and application-side guards.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'programs'
  ) then
    alter publication supabase_realtime add table public.programs;
  end if;
end $$;
