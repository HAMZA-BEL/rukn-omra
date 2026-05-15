create or replace function public.create_previous_payment(
  p_agency_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_date date default null,
  p_method text default null,
  p_note text default null,
  p_cheque_number text default null,
  p_paid_by text default null,
  p_legacy_receipt_number text default null,
  p_payment_id uuid default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_payment public.payments;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_client_id is null then
    raise exception 'client is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.agency_id = p_agency_id
  ) then
    raise exception 'invalid client';
  end if;

  insert into public.payments (
    id,
    agency_id,
    client_id,
    amount,
    date,
    method,
    receipt_no,
    receipt_sequence,
    payment_type,
    legacy_receipt_number,
    note,
    cheque_number,
    paid_by
  )
  values (
    coalesce(p_payment_id, gen_random_uuid()),
    p_agency_id,
    p_client_id,
    p_amount,
    coalesce(p_date, current_date),
    nullif(trim(p_method), ''),
    null,
    null,
    'previous',
    nullif(trim(p_legacy_receipt_number), ''),
    nullif(trim(p_note), ''),
    nullif(trim(p_cheque_number), ''),
    nullif(trim(p_paid_by), '')
  )
  returning * into inserted_payment;

  return inserted_payment;
end;
$$;

revoke all on function public.create_previous_payment(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_previous_payment(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  uuid
) to authenticated;
