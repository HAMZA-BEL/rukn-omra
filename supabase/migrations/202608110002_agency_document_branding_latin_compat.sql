alter table public.agencies
  add column if not exists address_primary_latin text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agencies'
      and column_name = 'address_primary_fr'
  ) then
    execute $copy$
      update public.agencies
      set address_primary_latin = address_primary_fr
      where nullif(btrim(address_primary_latin), '') is null
        and nullif(btrim(address_primary_fr), '') is not null
    $copy$;
  end if;
end
$$;

comment on column public.agencies.address_primary_latin is
  'Primary agency address written with Latin characters; language-neutral.';
