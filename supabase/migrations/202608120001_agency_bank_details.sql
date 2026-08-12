alter table public.agencies
  add column if not exists bank_name text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_account_number text,
  add column if not exists bank_rib text,
  add column if not exists bank_iban text,
  add column if not exists bank_note text,
  add column if not exists bank_swift text;

comment on column public.agencies.bank_account_number is
  'Optional agency bank account or CB number displayed on selected documents.';

comment on column public.agencies.bank_swift is
  'Optional agency SWIFT/BIC identifier displayed on selected documents.';
