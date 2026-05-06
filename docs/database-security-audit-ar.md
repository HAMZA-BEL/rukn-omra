# تقرير تدقيق قاعدة البيانات والأمان والتوسع - Umrah Pro / Rukn SaaS

تاريخ المراجعة: 2026-05-06  
النطاق: `SUPABASE_SCHEMA.sql`, `src/lib/db.js`, `src/hooks/useStore.js`, `src/hooks/useAuth.js`, `netlify/functions/create-user.js`, `netlify/functions/update-user.js`, storage utilities, invoices/contracts/badges flows.

## الخلاصة التنفيذية

النظام لديه أساس جيد لعزل الوكالات: أغلب الجداول tenant-owned تحتوي `agency_id not null`، وRLS مفعلة على الجداول الأساسية، ومعظم استعلامات frontend تضيف `.eq("agency_id", agencyId)`. لكن هذا لا يكفي للإنتاج الحقيقي بعد. توجد ثغرات معمارية مهمة في status/role enforcement، onboarding، relational integrity، invoice/payment correctness، وperformance.

الحكم الصريح:

- جاهز لـ 10 وكالات حقيقية؟ لا قبل إصلاح البنود Critical أدناه. بعد إصلاحها يمكن تشغيل pilot محدود ومراقب.
- جاهز لـ 50 وكالة؟ لا. يحتاج pagination، فهارس إضافية، وفصل العمليات المالية إلى RPC transactional.
- جاهز لـ 100+ وكالة؟ لا بالتصميم الحالي للتحميل الكامل client-side وغياب archive/query strategy لبعض الجداول.

## التقييم الرقمي

| المجال | الدرجة |
|---|---:|
| Multi-tenant isolation | 7/10 |
| RLS security | 5.5/10 |
| Schema design | 6/10 |
| Data integrity | 5/10 |
| Performance/scalability | 5/10 |
| Onboarding flow | 4/10 |
| Storage/file safety | 7/10 |
| API/server-side safety | 6.5/10 |
| Production readiness | 5/10 |

## نقاط قوية موجودة

- كل الجداول الأساسية تقريبا تحتوي `agency_id not null`: `users`, `programs`, `clients`, `payments`, `invoices`, `activity_log`, `notifications`, `badge_templates`, `contract_templates`.
- RLS مفعلة على الجداول الأساسية في `SUPABASE_SCHEMA.sql:384-396`.
- أغلب استعلامات `src/lib/db.js` scoped بـ `agency_id`.
- `payments` direct insert/update/delete محظور ومحول إلى RPC مع receipt counter.
- Storage buckets private وتستخدم path prefix مثل `agencies/{agencyId}/...`.
- `create-user.js` و`update-user.js` يستخدمان `SUPABASE_SERVICE_ROLE_KEY` server-side فقط، ولم أجد service role key في frontend.

## A. Critical - يجب الإصلاح قبل إضافة وكالات جديدة

### DB-01 - onboarding snippet قد يربط مستخدما بأول وكالة في النظام

- الأولوية: Critical
- الملفات المتأثرة: `src/App.jsx:896-920`
- الخطر: عند غياب `public.users` row، تعرض الواجهة SQL يحتوي `(SELECT id FROM public.agencies LIMIT 1)`. في بيئة multi-tenant هذا قد يربط owner جديد بوكالة عشوائية/أول وكالة، فيفتح له بيانات وكالة أخرى.
- لماذا يهم: هذا أخطر مسار cross-agency فعلي لأنه يحدث أثناء الإعداد اليدوي.
- التحقق: افتح التطبيق بحساب Auth لا يملك profile. ستظهر SQL تربط المستخدم بـ `SELECT id FROM public.agencies LIMIT 1`.
- الإصلاح: لا تعرض SQL تنفيذي بـ `LIMIT 1`. اجعل الرسالة تقول "contact system admin"، أو استخدم placeholder صريح لا يعمل بدون UUID.

بديل آمن:

```sql
-- لا تستخدم LIMIT 1 نهائيا
select public.create_new_agency('Agency AR', 'Agency FR');

insert into public.users (id, agency_id, email, role, full_name, status)
select au.id,
       '<agency_uuid>'::uuid,
       au.email,
       'owner',
       split_part(au.email, '@', 1),
       'active'
from auth.users au
where lower(au.email) = lower('<owner_email>');
```

تغيير ملف مقترح:

```jsx
// src/App.jsx
// Replace the executable SQL block with non-executable guidance.
<pre>{`Create/select the correct agency UUID first, then link this user manually.
Never use "SELECT id FROM public.agencies LIMIT 1" in production.`}</pre>
```

### DB-02 - `status = disabled/invited` لا يمنع الوصول على مستوى RLS

- الأولوية: Critical
- الملفات المتأثرة: `SUPABASE_SCHEMA.sql:371-381`, `src/hooks/useAuth.js:35-42`, `netlify/functions/update-user.js`
- الخطر: `get_agency_id()` يرجع `agency_id` لأي user موجود في `public.users` بغض النظر عن `status`. الواجهة توقع disabled user للخروج، لكن أي شخص يحتفظ بـ JWT يستطيع استخدام REST/RPC مباشرة حتى لو كان `status='disabled'`.
- لماذا يهم: frontend ليس security boundary. RLS يجب أن يمنع disabled/invited users.
- التحقق: عطّل user من UI أو SQL، ثم جرّب:

```bash
curl "$SUPABASE_URL/rest/v1/clients?select=id&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <disabled_user_access_token>"
```

إذا رجع rows فالعزل مكسور.

- الإصلاح: اجعل `get_agency_id()` يعيد agency فقط للمستخدم `active`. ثم أضف RPC لتفعيل invited user بعد تعيين password.

```sql
create or replace function public.get_agency_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select agency_id
  from public.users
  where id = auth.uid()
    and status = 'active'
  limit 1
$$;

create or replace function public.activate_own_invited_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.users
  set status = 'active',
      updated_at = now()
  where id = auth.uid()
    and status = 'invited';
end;
$$;

revoke all on function public.activate_own_invited_user() from public, anon, authenticated;
grant execute on function public.activate_own_invited_user() to authenticated;
```

تغيير ملف مقترح:

```jsx
// src/components/SetPasswordPage.jsx
const { error: err } = await supabase.auth.updateUser({ password: pass1 });
if (!err) {
  await supabase.rpc("activate_own_invited_user");
}
```

وتحقق في Netlify functions:

```js
// create-user.js / update-user.js after requesterProfile load
if ((requesterProfile.status || "").toLowerCase() !== "active") {
  return { statusCode: 403, body: JSON.stringify({ error: "Inactive account" }) };
}
```

### DB-03 - أدوار owner/manager/staff غير مطبقة في أغلب RLS/RPC

- الأولوية: Critical/High حسب نموذج الصلاحيات التجاري.
- الملفات المتأثرة: `SUPABASE_SCHEMA.sql:400-804`, `SUPABASE_SCHEMA.sql:843-1229`
- الخطر: أي authenticated active user داخل الوكالة يستطيع عبر direct API أن يعدل `agencies`, `programs`, `clients`, `notifications`, `badge_templates`, وأن ينشئ/يحذف payments/invoices عبر RPC. الواجهة تخفي بعض الأزرار فقط.
- لماذا يهم: staff account المخترق يستطيع تعديل بيانات مالية أو حذف دفعات/فواتير.
- التحقق: استخدم token staff ونفذ:

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/agencies?id=eq.<agency_id>" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <staff_token>" \
  -H "Content-Type: application/json" \
  -d '{"bank_rib":"changed-by-staff"}'
```

- الإصلاح: أضف role helper وطبقه في policies/RPC.

```sql
create or replace function public.has_agency_role(allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.agency_id = public.get_agency_id()
      and u.status = 'active'
      and lower(u.role) = any(allowed_roles)
  )
$$;

drop policy if exists "agencies_update" on public.agencies;
create policy "agencies_update" on public.agencies
  for update using (
    id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  )
  with check (
    id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );

drop policy if exists "programs_delete" on public.programs;
create policy "programs_delete" on public.programs
  for delete using (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using (
    agency_id = public.get_agency_id()
    and public.has_agency_role(array['owner','manager'])
  );
```

داخل RPCs الحساسة:

```sql
-- داخل issue_final_invoice/create_payment_with_receipt/trash/restore/delete functions
if not public.has_agency_role(array['owner','manager','staff']) then
  raise exception 'insufficient permissions';
end if;

-- داخل delete_trashed_payment و invoice permanent delete logic
if not public.has_agency_role(array['owner','manager']) then
  raise exception 'insufficient permissions';
end if;
```

### DB-04 - علاقات tenant-owned لا تضمن same-agency FK

- الأولوية: Critical
- الجداول المتأثرة: `clients.program_id`, `clients.represented_by_client_id`, `payments.client_id`, `notifications.program_id`, `activity_log.user_id`, `invoices.client_id/program_id`
- الخطر: FK العادي على `id` فقط يثبت أن الصف موجود، لكنه لا يثبت أنه من نفس `agency_id`. بعض policies تغطي `program_id` في `clients`، لكن لا تغطي `represented_by_client_id`, `notifications.target_id`, ولا service-role/manual imports.
- لماذا يهم: يمكن إدخال UUID من وكالة أخرى إذا كان معروفا/مسربا. حتى الفشل/النجاح يكشف وجود UUID في وكالة أخرى.
- التحقق:

```sql
select c.id, c.agency_id, c.represented_by_client_id, r.agency_id as represented_agency
from public.clients c
join public.clients r on r.id = c.represented_by_client_id
where c.agency_id <> r.agency_id;

select p.id, p.agency_id, p.client_id, c.agency_id as client_agency
from public.payments p
join public.clients c on c.id = p.client_id
where p.agency_id <> c.agency_id;
```

- الإصلاح: أضف composite unique indexes ثم composite FKs، ونظف البيانات قبل التفعيل.

```sql
create unique index if not exists programs_agency_id_id_uidx on public.programs(agency_id, id);
create unique index if not exists clients_agency_id_id_uidx on public.clients(agency_id, id);

-- تنظيف قبل constraints
update public.clients c
set represented_by_client_id = null
where represented_by_client_id is not null
  and not exists (
    select 1 from public.clients r
    where r.id = c.represented_by_client_id
      and r.agency_id = c.agency_id
  );

update public.notifications n
set program_id = null
where program_id is not null
  and not exists (
    select 1 from public.programs p
    where p.id = n.program_id
      and p.agency_id = n.agency_id
  );

alter table public.clients
  add constraint clients_program_same_agency
  foreign key (agency_id, program_id)
  references public.programs(agency_id, id)
  on delete set null (program_id);

alter table public.clients
  add constraint clients_represented_same_agency
  foreign key (agency_id, represented_by_client_id)
  references public.clients(agency_id, id)
  on delete set null (represented_by_client_id);

alter table public.payments
  add constraint payments_client_same_agency
  foreign key (agency_id, client_id)
  references public.clients(agency_id, id)
  on delete cascade;

alter table public.notifications
  add constraint notifications_program_same_agency
  foreign key (agency_id, program_id)
  references public.programs(agency_id, id)
  on delete set null (program_id);
```

### DB-05 - `invoices` ليست relationally trustworthy

- الأولوية: Critical
- الملفات والجداول: `SUPABASE_SCHEMA.sql:239-260`, `SUPABASE_SCHEMA.sql:843-943`, `src/components/PrintTemplates.jsx:480-486`
- الخطر: `invoices.client_id` و`program_id` من نوع `text` بلا FK. `issue_final_invoice` لا يتحقق أن `p_client_id`, `p_program_id`, `payment_references`, `amount_snapshot` تنتمي للوكالة أو صحيحة. أي user داخل الوكالة يمكنه إصدار invoice رسمية forged snapshots.
- لماذا يهم: الفواتير مستند مالي رسمي. يجب ألا تعتمد على snapshots من المتصفح فقط.
- التحقق: استدع `issue_final_invoice` بعميل غير موجود وبـ amount عشوائي؛ ستصدر فاتورة إذا كان `agency_id` صحيحا.
- الإصلاح: حول ids إلى `uuid` أو تحقق منها داخل RPC، واحسب/ثبت المبالغ من DB لا من المتصفح.

تشخيص قبل التحويل:

```sql
select id, client_id
from public.invoices
where client_id is not null
  and client_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
```

جزء validation يجب إضافته داخل `issue_final_invoice`:

```sql
declare
  v_client_id uuid;
  v_program_id uuid;
begin
  if p_agency_id is null or p_agency_id <> public.get_agency_id() then
    raise exception 'invalid agency';
  end if;
  if not public.has_agency_role(array['owner','manager']) then
    raise exception 'insufficient permissions';
  end if;

  if nullif(p_client_id, '') is not null then
    v_client_id := p_client_id::uuid;
    if not exists (
      select 1 from public.clients c
      where c.id = v_client_id
        and c.agency_id = p_agency_id
        and coalesce(c.deleted, false) = false
    ) then
      raise exception 'invalid client';
    end if;
  end if;

  if nullif(p_program_id, '') is not null then
    v_program_id := p_program_id::uuid;
    if not exists (
      select 1 from public.programs p
      where p.id = v_program_id
        and p.agency_id = p_agency_id
        and coalesce(p.deleted, false) = false
    ) then
      raise exception 'invalid program';
    end if;
  end if;
end;
```

ملف مقترح:

```js
// src/utils/invoices/invoiceSnapshots.js
const paymentReferenceSnapshot = (payment = {}) => ({
  id: trimInvoiceValue(payment.id),
  receiptNumber: trimInvoiceValue(payment.receiptNo || payment.receiptNumber),
  date: trimInvoiceValue(payment.date),
  amount: safeAmount(payment.amount),
  method: trimInvoiceValue(payment.method),
  chequeNumber: trimInvoiceValue(payment.chequeNumber),
  paidBy: trimInvoiceValue(payment.paidBy),
});
```

ثم تحقق داخل RPC أن كل `paymentReferences[*].id` من `public.payments` بنفس الوكالة ونفس العميل.

### DB-06 - soft delete يمكنه إخفاء/إتلاف السجلات المالية

- الأولوية: Critical/High
- الملفات والجداول: `src/hooks/useStore.js:1062-1089`, `src/hooks/useStore.js:1294-1326`, `SUPABASE_SCHEMA.sql:181-199`
- الخطر: حذف client/program soft-delete يخفي payments من local state عبر `removePaymentsByClient`, لكن DB payments تبقى active. الحذف النهائي للعميل يستخدم FK `payments.client_id on delete cascade`، ما يعني فقدان دفعات مالية نهائيا عند hard-delete client.
- لماذا يهم: الدفعات لا يجب أن تضيع بسبب حذف ملف معتمر. السجلات المالية يجب أن تكون immutable أو قابلة للتدقيق.
- التحقق: أنشئ client + payment، ثم purge client من Trash. راقب `payments` في DB؛ سيحذف cascade.
- الإصلاح: لا تستخدم cascade للمدفوعات في الإنتاج. اجعل client deletion محظورا إذا لديه payments، أو استخدم soft delete فقط.

```sql
alter table public.payments drop constraint if exists payments_client_id_fkey;
alter table public.payments
  add constraint payments_client_id_fkey
  foreign key (client_id) references public.clients(id)
  on delete restrict;
```

الأفضل: أضف RPC `purge_client` يتحقق:

```sql
if exists (select 1 from public.payments where client_id = p_client_id and agency_id = p_agency_id) then
  raise exception 'cannot permanently delete client with payments';
end if;
```

## B. High - إصلاح قريب

### DB-07 - `archive_activity_log` يمكن أن يخفي audit trail

- الأولوية: High
- الملفات: `SUPABASE_SCHEMA.sql:285-290`, `SUPABASE_SCHEMA.sql:1307-1331`
- الخطر: `activity_log_all` لا يعمل كـ all؛ هو يقرأ `activity_log` فقط ولا يعمل `union` مع `activity_log_archive`. عند تشغيل archive تختفي السجلات القديمة من UI. كذلك `days_threshold` غير مقيد.
- التحقق: شغل `select public.archive_activity_log(0);` ثم افتح activity page. ستختفي السجلات من live view.
- الإصلاح:

```sql
drop view if exists public.activity_log_all;
create view public.activity_log_all
with (security_invoker = true) as
  select id, agency_id, user_id, type, description, client_name, created_at, false as is_archived
  from public.activity_log
  where agency_id = public.get_agency_id()
  union all
  select id, agency_id, user_id, type, description, client_name, created_at, true as is_archived
  from public.activity_log_archive
  where agency_id = public.get_agency_id();

revoke all on function public.archive_activity_log(integer) from public, anon, authenticated;
grant execute on function public.archive_activity_log(integer) to authenticated;
```

وأضف داخل function:

```sql
if days_threshold < 30 then
  raise exception 'days_threshold too small';
end if;
```

### DB-08 - Netlify user management جيد جزئيا لكنه غير transactional وغير كاف لتعطيل Auth

- الأولوية: High
- الملفات: `netlify/functions/create-user.js`, `netlify/functions/update-user.js`
- الخطر: `update-user.js` يغير `public.users.status` فقط ولا يعطل Auth user فعليا. `create-user.js` يفحص عدد المستخدمين ثم ينشئ؛ طلبان متوازيان قد يتجاوزان limit.
- التحقق: عطّل user ثم استخدم token قديم. أو أرسل طلبين create-user متوازيين.
- الإصلاح:
  - تحقق أن requester `status='active'`.
  - عند disable، عطّل Auth user أو امنعه من RLS كما في DB-02.
  - انقل user limit إلى DB constraint أو table-driven subscription limits.

إذا كان حد "manager واحد + staff واحد" مطلوب حاليا:

```sql
create unique index if not exists users_one_active_manager_per_agency
on public.users(agency_id)
where role in ('owner','manager') and status <> 'disabled';

create unique index if not exists users_one_active_staff_per_agency
on public.users(agency_id)
where role = 'staff' and status <> 'disabled';
```

### DB-09 - `users.email unique` عالمي وقد يقيّد SaaS multi-tenant

- الأولوية: Medium/High product decision
- الجدول: `public.users`
- الخطر: نفس email لا يمكن أن يكون عضوا في وكالتين. هذا قد يكون مقبولا لأن Supabase Auth email عالمي، لكنه يجب أن يكون قرارا واعيا.
- التحقق: حاول إضافة نفس email لوكالة ثانية.
- الإصلاح: إما قبول هذا كقاعدة product، أو تصميم membership table مستقل:

```sql
public.user_agency_memberships (
  user_id uuid references auth.users(id),
  agency_id uuid references agencies(id),
  role text,
  status text,
  primary key (user_id, agency_id)
)
```

### DB-10 - frontend يحمل بيانات كثيرة دفعة واحدة

- الأولوية: High قبل 50 وكالة
- الملفات: `src/hooks/useStore.js:581-592`, `src/lib/db.js:441-582`, `src/lib/db.js:630-657`
- الخطر: عند login يتم تحميل كل `clients`, `payments`, `programs`, `notifications`, trash. مع آلاف المعتمرين شهريا سيصبح login بطيئا والذاكرة كبيرة.
- التحقق: seed 20k clients و100k payments داخل وكالة واحدة، ثم قس زمن initial load.
- الإصلاح:
  - clients: server-side pagination + filters.
  - payments: fetch by `client_id` عند فتح client detail أو aggregated summary view.
  - invoices: pagination by year/status/search.
  - notifications: limit unread/recent فقط.

تغييرات API مقترحة:

```js
// src/lib/db.js
clients.fetchPage(agencyId, { page, limit, programId, search, status })
payments.fetchByClient(agencyId, clientId)
invoices.fetchPage(agencyId, { page, limit, year, status, search })
```

### DB-11 - فهارس ناقصة للاستعلامات الحالية وRLS

- الأولوية: High
- الجداول: `programs`, `clients`, `payments`, `invoices`, `notifications`
- الخطر: الفهارس الموجودة جيدة كبداية، لكنها لا تطابق filters/order الحالية بما يكفي.
- الإصلاح الآن:

```sql
create index if not exists idx_programs_agency_deleted_created
  on public.programs(agency_id, deleted, created_at);

create index if not exists idx_clients_agency_deleted_registration
  on public.clients(agency_id, deleted, registration_date);

create index if not exists idx_clients_agency_program_deleted
  on public.clients(agency_id, program_id, deleted);

create index if not exists idx_clients_agency_archived_deleted
  on public.clients(agency_id, archived, deleted);

create index if not exists idx_payments_agency_status_created
  on public.payments(agency_id, status, created_at);

create index if not exists idx_payments_agency_client_status_date
  on public.payments(agency_id, client_id, status, date);

create index if not exists idx_invoices_agency_status_trashed
  on public.invoices(agency_id, status, trashed_at desc);

create index if not exists idx_notifications_agency_created
  on public.notifications(agency_id, created_at desc);
```

للبحث النصي لاحقا:

```sql
create extension if not exists pg_trgm;
create index if not exists idx_clients_agency_name_trgm
  on public.clients using gin (name gin_trgm_ops);
create index if not exists idx_clients_passport_number
  on public.clients ((passport->>'number'));
```

### DB-12 - naming/status inconsistencies

- الأولوية: Medium/High
- الأماكن: `clients` vs `pilgrims`, `status` vs `deleted`, `trashed_at/deleted_at`, `owner` normalized to `manager` في `UsersPage.jsx:7-10`
- الخطر: منطق trash/restore/export يصبح هشا بسبب أسماء متداخلة. مثال: `programs/clients` يستخدمان `deleted boolean`; `payments/invoices` يستخدمان `status`.
- الإصلاح: وثق vocabulary موحد:
  - DB table تبقى `clients` إذا كان migration مكلفا، لكن UI terminology يكون `pilgrim`.
  - استخدم status موحد: `active`, `archived`, `trashed`, `deleted` أو fields موحدة.
  - لا تحول `owner` إلى `manager` في UI؛ اعرضه كـ owner.

## C. Medium/Low - تحسينات لاحقة

### DB-13 - Storage آمن نسبيا لكن يحتاج role/client validation قبل التوسع

- الأولوية: Medium
- الملفات: `SUPABASE_SCHEMA.sql:475-693`, `src/features/badges/utils/badgeStorage.js`, `src/utils/agencyLogo.js`
- الخطر: المسار agency-scoped، لكن أي user داخل الوكالة يمكنه رفع/حذف `pilgrim-photos`, `badge-templates`, `agency-assets`. لا يوجد تحقق أن `clientId` في path يخص client حقيقي.
- الإصلاح:
  - bucket private كما هو.
  - خزّن path فقط في DB، لا public URL.
  - signed URLs قصيرة، 30 دقيقة للصور جيد؛ logo 24h مقبول لكن يمكن تخفيضه.
  - اجعل `agency-assets` و`badge-templates` owner/manager فقط.
  - أضف table `client_files` لاحقا بدل الاعتماد على path فقط.

مثال policy للـ agency assets:

```sql
drop policy if exists "agency_assets_insert" on storage.objects;
create policy "agency_assets_insert" on storage.objects
  for insert with check (
    bucket_id = 'agency-assets'
    and split_part(name, '/', 1) = 'agencies'
    and split_part(name, '/', 2) = public.get_agency_id()::text
    and public.has_agency_role(array['owner','manager'])
  );
```

### DB-14 - backup/import حساس جدا

- الأولوية: Medium
- الملفات: `src/hooks/useStore.js:1451-1481`, `src/services/dataBackupService.js`
- الخطر: export يحتوي passport/payment/agency data في JSON غير مشفر. import قد يستبدل local state ببيانات وكالة أخرى؛ و`forceSync` قد يدفعها للوكالة الحالية.
- الإصلاح:
  - اجعل backup/export owner فقط.
  - أضف `agencyId` و`schemaVersion` للملف، وارفض import إذا `agencyId` لا يساوي current agency إلا بتأكيد admin صريح.
  - لا تستورد payments إلى production إلا عبر RPC/transaction.
  - شفر backup محليا بكلمة مرور إن كان سيتم تبادله.

### DB-15 - بعض columns تحتاج constraints

- الأولوية: Medium
- الجداول: `payments`, `programs`, `clients`, `notifications`
- الإصلاح:

```sql
alter table public.payments
  add constraint payments_amount_positive check (amount > 0),
  add constraint payments_status_check check (status in ('active','trashed','deleted'));

alter table public.programs
  add constraint programs_seats_nonnegative check (seats >= 0),
  add constraint programs_status_check check (status in ('active','archived','closed'));

alter table public.clients
  add constraint clients_prices_nonnegative
  check (official_price >= 0 and sale_price >= 0);
```

### DB-16 - برامج dates مخزنة كـ `text`

- الأولوية: Medium
- الجدول: `programs`
- الخطر: `departure` و`return_date` كنص يجعل الفرز والفلاتر الزمنية ضعيفة.
- الإصلاح: أضف columns date حقيقية أو حولها:

```sql
alter table public.programs add column if not exists departure_date date;
alter table public.programs add column if not exists return_date_value date;
```

ثم migration تدريجي من النصوص الصالحة.

## D. Production onboarding flow المقترح

المرحلة الحالية، قبل admin panel:

1. أنشئ agency عبر SQL آمن:

```sql
select public.create_new_agency('اسم الوكالة', 'Agency Name');
```

2. أنشئ Auth user من Supabase Dashboard أو server function admin-only.
3. اربط `public.users` يدويا بـ UUID الصحيح، `role='owner'`, `status='active'`.
4. شغّل diagnostics:

```sql
select id, email, agency_id, role, status
from public.users
where email = '<owner_email>';
```

5. لا تستخدم metadata من client signup لإنشاء owner. `handle_new_auth_user()` مقبول للـ invite فقط إذا metadata تأتي من server موثوق.

لاحقا:

- ابنِ Admin-only Edge/Netlify function `create-agency-owner`.
- تستخدم service role server-side.
- transaction واحدة: create agency -> create auth user/invite -> insert user profile -> audit log.
- لا expose `create_new_agency` للـ authenticated users.

## E. Backup, recovery, production safety

- فعّل Supabase daily backups/PITR حسب الخطة المتاحة، ولا تعتمد على JSON export من الواجهة كنسخة إنتاجية.
- قبل أي migration: `pg_dump` للـ schema والبيانات، ونسخة Storage metadata/objects.
- استخدم staging project منفصل عن production، بنفس RLS والـ functions.
- migrations عبر Supabase CLI أو ملفات versioned، لا SQL dashboard فقط.
- كل migration لها rollback script أو forward-fix script.
- اختبر restore شهريا على staging.
- راقب:
  - Auth failed logins.
  - RPC errors: `issue_final_invoice`, `create_payment_with_receipt`, `delete_trashed_payment`.
  - RLS denied errors المفاجئة.
  - slow queries على `clients/payments/activity_log`.
  - Storage 403/404 spikes.
  - حجم `activity_log` و`notifications`.

## F. قائمة تحقق قبل إضافة كل وكالة حقيقية

1. تأكد أن Critical fixes مطبقة.
2. أنشئ الوكالة وowner بـ UUID صريح.
3. اختبر owner login وstaff login.
4. اختبر أن staff disabled لا يستطيع `select clients` عبر REST token.
5. اختبر أن وكالة A لا ترى clients/programs/payments/invoices لوكالة B.
6. اختبر إصدار receipt/invoice بتوازي.
7. اختبر backup/restore على staging وليس production.
8. وثق owner email, agency UUID, created_at, plan/limits.

## G. SQL diagnostics سريعة

```sql
-- tenant tables without agency_id
select table_schema, table_name
from information_schema.tables t
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name not in ('agencies')
  and not exists (
    select 1 from information_schema.columns c
    where c.table_schema = t.table_schema
      and c.table_name = t.table_name
      and c.column_name = 'agency_id'
  );

-- nullable agency_id
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name = 'agency_id'
  and is_nullable = 'YES';

-- tables with RLS disabled
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'agencies','users','programs','clients','payments','invoices',
    'receipt_counters','invoice_counters','activity_log','activity_log_archive',
    'notifications','badge_templates','contract_templates'
  )
  and rowsecurity = false;

-- cross-agency client/program links
select c.id, c.agency_id, c.program_id, p.agency_id as program_agency
from public.clients c
join public.programs p on p.id = c.program_id
where c.agency_id <> p.agency_id;

-- cross-agency represented-by links
select c.id, c.agency_id, c.represented_by_client_id, r.agency_id as represented_agency
from public.clients c
join public.clients r on r.id = c.represented_by_client_id
where c.agency_id <> r.agency_id;

-- cross-agency payments
select p.id, p.agency_id, p.client_id, c.agency_id as client_agency
from public.payments p
join public.clients c on c.id = p.client_id
where p.agency_id <> c.agency_id;
```

## H. ترتيب التنفيذ المقترح

1. أصلح onboarding/no-profile SQL في `src/App.jsx`.
2. غيّر `get_agency_id()` ليحترم `status='active'`، وأضف `activate_own_invited_user`.
3. أضف `has_agency_role()` وطبقه على agency settings, destructive deletes, invoices, payments, storage admin buckets.
4. أضف diagnostics ونظف cross-agency links، ثم composite FKs.
5. أصلح invoice RPC validation واجعل finance operations transactional.
6. أوقف hard delete للـ clients الذين لديهم payments.
7. أضف الفهارس المقترحة.
8. أضف pagination/fetch-by-client قبل 50 وكالة.
9. افصل staging/production migrations والـ backup strategy.

## الجواب النهائي الصريح

قاعدة البيانات ليست سيئة؛ فيها أساس multi-tenant واضح. لكنها ليست production-ready لتوزيع واسع على وكالات حقيقية قبل إصلاح status/RLS role enforcement، onboarding، invoice validation، وsame-agency foreign keys. الخطر الأكبر ليس أن `SELECT *` يعرض كل الوكالات؛ هذا محمي غالبا. الخطر الأكبر في المسارات الجانبية: onboarding يدوي خاطئ، disabled users، RPCs الحساسة، financial snapshots من المتصفح، وعلاقات لا تثبت same-agency.

