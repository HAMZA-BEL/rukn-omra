alter table public.payments
  add column if not exists payment_type text not null default 'normal';

alter table public.payments
  add column if not exists legacy_receipt_number text;

alter table public.payments
  drop constraint if exists payments_payment_type_check;

alter table public.payments
  add constraint payments_payment_type_check
  check (payment_type in ('normal', 'previous'));

create index if not exists idx_payments_agency_payment_type
  on public.payments (agency_id, payment_type);
