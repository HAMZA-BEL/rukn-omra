-- DB-05: Harden official invoice issuance validation.
-- Do not run automatically. Review diagnostics first, then apply manually.
--
-- Scope:
-- - Keep invoice columns as-is. client_id/program_id remain text in this batch.
-- - Keep invoice numbering behavior unchanged.
-- - Validate tenant ownership and payment references before creating new invoices.
--
-- ============================================================
-- 1) Diagnostics to run before applying this migration
-- ============================================================
--
-- Existing invoices with non-empty invalid UUID client_id:
-- select id, agency_id, client_id
-- from public.invoices
-- where nullif(trim(client_id), '') is not null
--   and trim(client_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
--
-- Existing invoices with non-empty invalid UUID program_id:
-- select id, agency_id, program_id
-- from public.invoices
-- where nullif(trim(program_id), '') is not null
--   and trim(program_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
--
-- Existing invoices whose client_id points outside the owning agency:
-- select i.id, i.agency_id, i.client_id, c.agency_id as client_agency_id
-- from public.invoices i
-- join public.clients c on c.id = trim(i.client_id)::uuid
-- where nullif(trim(i.client_id), '') is not null
--   and trim(i.client_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--   and i.agency_id <> c.agency_id;
--
-- Existing invoices whose program_id points outside the owning agency:
-- select i.id, i.agency_id, i.program_id, p.agency_id as program_agency_id
-- from public.invoices i
-- join public.programs p on p.id = trim(i.program_id)::uuid
-- where nullif(trim(i.program_id), '') is not null
--   and trim(i.program_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--   and i.agency_id <> p.agency_id;
--
-- Existing invoice payment references that contain ids. Older rows may have
-- payment references without ids; this migration validates ids when present.
-- select i.id as invoice_id,
--        i.agency_id,
--        ref.value->>'id' as payment_id
-- from public.invoices i
-- cross join lateral jsonb_array_elements(
--   case
--     when jsonb_typeof(i.payment_references) = 'array' then i.payment_references
--     else '[]'::jsonb
--   end
-- ) as ref(value)
-- where nullif(trim(ref.value->>'id'), '') is not null;

create or replace function public.issue_final_invoice(
  p_agency_id uuid,
  p_invoice_key text,
  p_client_id text,
  p_program_id text,
  p_issue_date date,
  p_recipient_type text,
  p_recipient_snapshot jsonb,
  p_program_snapshot jsonb,
  p_amount_snapshot jsonb,
  p_payment_references jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_invoice public.invoices;
  next_number integer;
  v_invoice_year integer;
  inserted_invoice public.invoices;
  v_requester_agency_id uuid;
  v_client_id_text text;
  v_program_id_text text;
  v_client_id uuid;
  v_program_id uuid;
  v_client_sale_price numeric;
  v_client_paid_total numeric;
  v_amount_total_text text;
  v_amount_total numeric;
  v_payment_refs jsonb;
  v_ref jsonb;
  v_payment_id_text text;
  v_payment_id uuid;
  v_payment_client_id uuid;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  v_requester_agency_id := public.get_agency_id();
  if p_agency_id is null or v_requester_agency_id is null or p_agency_id <> v_requester_agency_id then
    raise exception 'invalid agency';
  end if;
  if p_recipient_type not in ('client','company') then
    raise exception 'invalid recipient type';
  end if;

  -- Preserve existing idempotency/numbering behavior: an existing active invoice
  -- for the same tenant key is returned without consuming a new number.
  if p_invoice_key is not null and length(trim(p_invoice_key)) > 0 then
    select *
    into existing_invoice
    from public.invoices
    where agency_id = p_agency_id
      and invoice_key = p_invoice_key
      and status <> 'deleted'
    limit 1;
    if found then
      return existing_invoice;
    end if;
  end if;

  v_client_id_text := nullif(trim(coalesce(p_client_id, '')), '');
  if v_client_id_text is not null then
    if v_client_id_text !~* v_uuid_pattern then
      raise exception 'invalid client id';
    end if;
    v_client_id := v_client_id_text::uuid;

    select c.sale_price
    into v_client_sale_price
    from public.clients c
    where c.id = v_client_id
      and c.agency_id = p_agency_id;

    if not found then
      raise exception 'invalid client';
    end if;
  end if;

  v_program_id_text := nullif(trim(coalesce(p_program_id, '')), '');
  if v_program_id_text is not null then
    if v_program_id_text !~* v_uuid_pattern then
      raise exception 'invalid program id';
    end if;
    v_program_id := v_program_id_text::uuid;

    if not exists (
      select 1
      from public.programs p
      where p.id = v_program_id
        and p.agency_id = p_agency_id
    ) then
      raise exception 'invalid program';
    end if;
  end if;

  if p_amount_snapshot is not null and jsonb_typeof(p_amount_snapshot) <> 'object' then
    raise exception 'invalid amount snapshot';
  end if;

  if v_client_id is not null then
    v_amount_total_text := nullif(trim(coalesce(p_amount_snapshot->>'total', '')), '');
    if v_amount_total_text is null or v_amount_total_text !~ '^-?[0-9]+(\.[0-9]+)?$' then
      raise exception 'invalid invoice amount';
    end if;

    v_amount_total := v_amount_total_text::numeric;
    if abs(v_amount_total - coalesce(v_client_sale_price, 0)) > 0.01 then
      raise exception 'invoice amount does not match client sale price';
    end if;

    select coalesce(sum(p.amount), 0)
    into v_client_paid_total
    from public.payments p
    where p.agency_id = p_agency_id
      and p.client_id = v_client_id
      and coalesce(p.status, 'active') = 'active';

    if coalesce(v_client_paid_total, 0) + 0.01 < coalesce(v_client_sale_price, 0) then
      raise exception 'client is not paid in full';
    end if;
  end if;

  v_payment_refs := coalesce(p_payment_references, '[]'::jsonb);
  if jsonb_typeof(v_payment_refs) <> 'array' then
    raise exception 'invalid payment references';
  end if;

  for v_ref in
    select value
    from jsonb_array_elements(v_payment_refs) as refs(value)
  loop
    v_payment_id_text := nullif(trim(coalesce(
      v_ref->>'id',
      v_ref->>'paymentId',
      v_ref->>'payment_id',
      ''
    )), '');

    if v_payment_id_text is not null then
      if v_payment_id_text !~* v_uuid_pattern then
        raise exception 'invalid payment reference id';
      end if;

      v_payment_id := v_payment_id_text::uuid;
      select p.client_id
      into v_payment_client_id
      from public.payments p
      where p.id = v_payment_id
        and p.agency_id = p_agency_id
        and coalesce(p.status, 'active') = 'active';

      if not found then
        raise exception 'invalid payment reference';
      end if;
      if v_client_id is not null and v_payment_client_id <> v_client_id then
        raise exception 'payment reference does not belong to invoice client';
      end if;
    end if;
  end loop;

  v_invoice_year := extract(year from coalesce(p_issue_date, current_date))::integer;

  insert into public.invoice_counters (agency_id, invoice_year, last_number)
  values (p_agency_id, v_invoice_year, 0)
  on conflict (agency_id, invoice_year) do nothing;

  select last_number + 1
  into next_number
  from public.invoice_counters
  where agency_id = p_agency_id
    and invoice_year = v_invoice_year
  for update;

  update public.invoice_counters
  set last_number = next_number,
      updated_at = now()
  where agency_id = p_agency_id
    and invoice_year = v_invoice_year;

  insert into public.invoices (
    agency_id,
    client_id,
    program_id,
    invoice_number,
    invoice_display_number,
    invoice_year,
    issue_date,
    status,
    recipient_type,
    recipient_snapshot,
    program_snapshot,
    amount_snapshot,
    payment_references,
    invoice_key,
    created_by
  )
  values (
    p_agency_id,
    v_client_id_text,
    v_program_id_text,
    next_number,
    lpad(next_number::text, 4, '0') || '/' || v_invoice_year::text,
    v_invoice_year,
    coalesce(p_issue_date, current_date),
    'issued',
    p_recipient_type,
    coalesce(p_recipient_snapshot, '{}'::jsonb),
    coalesce(p_program_snapshot, '{}'::jsonb),
    coalesce(p_amount_snapshot, '{}'::jsonb),
    v_payment_refs,
    nullif(p_invoice_key, ''),
    auth.uid()
  )
  returning * into inserted_invoice;

  return inserted_invoice;
end;
$$;

revoke all on function public.issue_final_invoice(
  uuid,
  text,
  text,
  text,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from public, anon;

grant execute on function public.issue_final_invoice(
  uuid,
  text,
  text,
  text,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to authenticated;
