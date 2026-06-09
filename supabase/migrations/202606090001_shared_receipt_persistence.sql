-- Phase 2 Shared Receipt / Grouped Payment persistence.
-- Creates one payment_groups row and one linked payment row per covered client.

create unique index if not exists programs_agency_id_id_uidx
  on public.programs (agency_id, id);

create unique index if not exists clients_agency_id_id_uidx
  on public.clients (agency_id, id);

create table if not exists public.payment_groups (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  program_id uuid not null references public.programs(id),
  payer_client_id uuid null references public.clients(id) on delete set null,
  payer_name text not null,
  receipt_number text not null,
  payment_type text not null,
  payment_method text not null,
  cheque_number text null,
  paid_by text null,
  payment_date date not null,
  total_amount numeric not null,
  notes text null,
  covered_clients jsonb not null default '[]'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.payment_groups drop constraint if exists payment_groups_payment_type_check;
alter table public.payment_groups add constraint payment_groups_payment_type_check
  check (payment_type in ('normal', 'previous'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_groups_program_same_agency_fkey'
      and conrelid = 'public.payment_groups'::regclass
  ) then
    alter table public.payment_groups
      add constraint payment_groups_program_same_agency_fkey
      foreign key (agency_id, program_id)
      references public.programs (agency_id, id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_groups_payer_same_agency_fkey'
      and conrelid = 'public.payment_groups'::regclass
  ) then
    alter table public.payment_groups
      add constraint payment_groups_payer_same_agency_fkey
      foreign key (agency_id, payer_client_id)
      references public.clients (agency_id, id);
  end if;
end $$;

alter table public.payments
  add column if not exists group_payment_id uuid null references public.payment_groups(id) on delete set null;

create index if not exists payment_groups_agency_program_idx
  on public.payment_groups (agency_id, program_id);
create index if not exists payment_groups_receipt_number_idx
  on public.payment_groups (receipt_number);
create index if not exists payments_group_payment_id_idx
  on public.payments (group_payment_id);

create or replace function public.touch_payment_groups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_groups_updated_at on public.payment_groups;
create trigger trg_payment_groups_updated_at
before update on public.payment_groups
for each row execute function public.touch_payment_groups_updated_at();

revoke all on function public.touch_payment_groups_updated_at() from public, anon, authenticated;

alter table public.payment_groups enable row level security;

revoke all on table public.payment_groups from public, anon;
grant select, insert, update, delete on table public.payment_groups to authenticated;

drop policy if exists "payment_groups_select" on public.payment_groups;
drop policy if exists "payment_groups_insert" on public.payment_groups;
drop policy if exists "payment_groups_update" on public.payment_groups;
drop policy if exists "payment_groups_delete" on public.payment_groups;

create policy "payment_groups_select" on public.payment_groups
  for select using (agency_id = public.get_agency_id());

create policy "payment_groups_insert" on public.payment_groups
  for insert with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
    and (
      payer_client_id is null
      or exists (
        select 1
        from public.clients c
        where c.id = payer_client_id
          and c.agency_id = agency_id
          and c.program_id = program_id
      )
    )
  );

create policy "payment_groups_update" on public.payment_groups
  for update using (agency_id = public.get_agency_id())
  with check (
    agency_id = public.get_agency_id()
    and exists (
      select 1
      from public.programs p
      where p.id = program_id
        and p.agency_id = agency_id
    )
    and (
      payer_client_id is null
      or exists (
        select 1
        from public.clients c
        where c.id = payer_client_id
          and c.agency_id = agency_id
          and c.program_id = program_id
      )
    )
  );

create policy "payment_groups_delete" on public.payment_groups
  for delete using (agency_id = public.get_agency_id());

create or replace function public.create_shared_receipt(
  p_agency_id uuid,
  p_program_id uuid,
  p_payer_client_id uuid default null,
  p_payer_name text default null,
  p_payment_type text default 'normal',
  p_payment_method text default null,
  p_receipt_number text default null,
  p_cheque_number text default null,
  p_paid_by text default null,
  p_payment_date date default null,
  p_total_amount numeric default null,
  p_notes text default null,
  p_covered_clients jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_type text := lower(trim(coalesce(p_payment_type, 'normal')));
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_method_search text := lower(coalesce(p_payment_method, ''));
  v_cheque_number text := nullif(trim(coalesce(p_cheque_number, '')), '');
  v_paid_by text := nullif(trim(coalesce(p_paid_by, '')), '');
  v_payer_name text := nullif(trim(coalesce(p_payer_name, '')), '');
  v_receipt_number text;
  v_client_count integer := 0;
  v_distinct_client_count integer := 0;
  v_allocated_sum numeric := 0;
  v_group public.payment_groups;
  v_payments jsonb := '[]'::jsonb;
  v_covered_clients jsonb := '[]'::jsonb;
  v_next_number integer;
  v_amount_text text;
  v_is_cheque boolean;
  v_requires_paid_by boolean;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if p_program_id is null then
    raise exception 'program is required';
  end if;
  if not exists (
    select 1 from public.programs p
    where p.id = p_program_id
      and p.agency_id = p_agency_id
  ) then
    raise exception 'invalid program';
  end if;
  if v_payment_type not in ('normal', 'previous') then
    raise exception 'invalid payment type';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if v_payment_method is null then
    raise exception 'payment method is required';
  end if;
  if p_covered_clients is null or jsonb_typeof(p_covered_clients) <> 'array' then
    raise exception 'covered clients must be an array';
  end if;

  v_is_cheque := v_method_search like '%شيك%'
    or v_method_search like '%chèque%'
    or v_method_search like '%cheque%'
    or v_method_search like '%check%';
  v_requires_paid_by := v_is_cheque
    or v_method_search like '%تحويل%'
    or v_method_search like '%virement%'
    or v_method_search like '%transfer%'
    or v_method_search like '%إيداع%'
    or v_method_search like '%ايداع%'
    or v_method_search like '%dépôt%'
    or v_method_search like '%depot%'
    or v_method_search like '%deposit%';

  if v_is_cheque and v_cheque_number is null then
    raise exception 'cheque number is required';
  end if;
  if v_requires_paid_by and v_paid_by is null then
    raise exception 'paid by is required';
  end if;
  if v_payment_type = 'previous' and nullif(trim(coalesce(p_receipt_number, '')), '') is null then
    raise exception 'receipt number is required';
  end if;

  if p_payer_client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = p_payer_client_id
      and c.agency_id = p_agency_id
      and c.program_id = p_program_id
  ) then
    raise exception 'invalid payer client';
  end if;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  )
  select
    count(*)::integer,
    count(distinct client_id)::integer,
    coalesce(sum(allocated_amount), 0)
  into v_client_count, v_distinct_client_count, v_allocated_sum
  from parsed;

  if v_client_count <= 0 then
    raise exception 'at least one covered client is required';
  end if;
  if v_distinct_client_count <> v_client_count then
    raise exception 'duplicate covered clients are not allowed';
  end if;
  if round(v_allocated_sum * 100) <> round(p_total_amount * 100) then
    raise exception 'allocated total must equal receipt total';
  end if;

  if exists (
    with parsed as (
      select
        nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
        coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
      from jsonb_array_elements(p_covered_clients) as item(value)
    )
    select 1
    from parsed pc
    left join public.clients c
      on c.id = pc.client_id
     and c.agency_id = p_agency_id
     and c.program_id = p_program_id
    where pc.client_id is null
       or pc.allocated_amount <= 0
       or c.id is null
  ) then
    raise exception 'invalid covered client allocation';
  end if;

  if v_payment_type = 'normal' then
    insert into public.receipt_counters (agency_id, last_number)
    values (p_agency_id, 0)
    on conflict (agency_id) do nothing;

    select last_number + 1
    into v_next_number
    from public.receipt_counters
    where agency_id = p_agency_id
    for update;

    update public.receipt_counters
    set last_number = v_next_number,
        updated_at = now()
    where agency_id = p_agency_id;

    v_receipt_number := 'REC-' || lpad(v_next_number::text, 3, '0');
  else
    v_receipt_number := nullif(trim(coalesce(p_receipt_number, '')), '');
  end if;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      nullif(trim(coalesce(item.value->>'client_name', item.value->>'clientName', item.value->>'name')), '') as client_name,
      nullif(trim(coalesce(item.value->>'phone')), '') as phone,
      nullif(trim(coalesce(item.value->>'passport')), '') as passport,
      coalesce(nullif(coalesce(item.value->>'total_price', item.value->>'totalPrice'), '')::numeric, 0) as total_price,
      coalesce(nullif(coalesce(item.value->>'paid_before', item.value->>'paidBefore'), '')::numeric, 0) as paid_before,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount,
      coalesce(nullif(coalesce(item.value->>'remaining_after', item.value->>'remainingAfter'), '')::numeric, 0) as remaining_after
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  ),
  normalized as (
    select
      parsed.ordinality,
      parsed.client_id,
      coalesce(parsed.client_name, c.name) as client_name,
      parsed.phone,
      parsed.passport,
      parsed.total_price,
      parsed.paid_before,
      parsed.allocated_amount,
      parsed.remaining_after
    from parsed
    join public.clients c
      on c.id = parsed.client_id
     and c.agency_id = p_agency_id
     and c.program_id = p_program_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'client_id', client_id,
    'client_name', client_name,
    'phone', phone,
    'passport', passport,
    'total_price', total_price,
    'paid_before', paid_before,
    'allocated_amount', allocated_amount,
    'remaining_after', remaining_after
  ) order by ordinality), '[]'::jsonb)
  into v_covered_clients
  from normalized;

  insert into public.payment_groups (
    agency_id,
    program_id,
    payer_client_id,
    payer_name,
    receipt_number,
    payment_type,
    payment_method,
    cheque_number,
    paid_by,
    payment_date,
    total_amount,
    notes,
    covered_clients,
    created_by
  )
  values (
    p_agency_id,
    p_program_id,
    p_payer_client_id,
    coalesce(v_payer_name, '—'),
    v_receipt_number,
    v_payment_type,
    v_payment_method,
    v_cheque_number,
    v_paid_by,
    coalesce(p_payment_date, current_date),
    p_total_amount,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_covered_clients,
    auth.uid()
  )
  returning * into v_group;

  with parsed as (
    select
      item.ordinality,
      nullif(coalesce(item.value->>'client_id', item.value->>'clientId', item.value->>'id'), '')::uuid as client_id,
      coalesce(nullif(coalesce(item.value->>'allocated_amount', item.value->>'allocatedAmount'), '')::numeric, 0) as allocated_amount
    from jsonb_array_elements(p_covered_clients) with ordinality as item(value, ordinality)
  ),
  inserted as (
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
      paid_by,
      group_payment_id
    )
    select
      gen_random_uuid(),
      p_agency_id,
      parsed.client_id,
      parsed.allocated_amount,
      coalesce(p_payment_date, current_date),
      v_payment_method,
      v_receipt_number,
      null,
      v_payment_type,
      case when v_payment_type = 'previous' then v_receipt_number else null end,
      nullif(trim(coalesce(p_notes, '')), ''),
      v_cheque_number,
      v_paid_by,
      v_group.id
    from parsed
    order by parsed.ordinality
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted) order by inserted.created_at), '[]'::jsonb)
  into v_payments
  from inserted;

  v_amount_text := trim(to_char(p_total_amount, 'FM999G999G990D00'));
  insert into public.activity_log (id, agency_id, user_id, type, description, client_name, created_at)
  values (
    gen_random_uuid(),
    p_agency_id,
    auth.uid(),
    'shared_receipt_create',
    'تم إنشاء وصل مشترك بقيمة ' || v_amount_text || ' د.م عن ' || v_client_count::text || ' معتمرين — الدافع: ' || coalesce(v_payer_name, '—'),
    coalesce(v_payer_name, null),
    now()
  );

  return jsonb_build_object(
    'payment_group', to_jsonb(v_group),
    'payments', v_payments,
    'receipt_number', v_receipt_number
  );
end;
$$;

revoke all on function public.create_shared_receipt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_shared_receipt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  text,
  jsonb
) to authenticated;
