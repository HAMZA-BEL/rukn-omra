alter table public.agencies
  add column if not exists document_branding jsonb not null
  default '{"documents":{}}'::jsonb;

alter table public.agencies
  add column if not exists address_primary_ar text,
  add column if not exists address_primary_latin text;

comment on column public.agencies.document_branding is
  'Shared, optional visual identity configuration for agency-generated documents.';
