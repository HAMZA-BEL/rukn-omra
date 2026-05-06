-- DB-08: Performance index foundation for agency-scoped SaaS queries.
-- Do not run automatically. Review, then apply manually.
--
-- Scope:
-- - Indexes only.
-- - No RLS, schema, business logic, UI, payment, or invoice behavior changes.
-- - Existing simple agency indexes are kept; these compound indexes match current
--   filters/order patterns and upcoming pagination work.
--
-- Notes:
-- - Rooming currently uses client docs/local UI state; there is no public rooms
--   or rooming table to index in this schema.
-- - Text search/trigram indexes are intentionally deferred to a later batch.
-- - On large production tables, apply during a quiet maintenance window because
--   CREATE INDEX can briefly take stronger locks than normal reads.

-- Programs page:
-- db.programs.fetchAll filters by agency_id + active deleted flag and orders by created_at.
create index if not exists idx_programs_agency_deleted_created
  on public.programs (agency_id, deleted, created_at);

-- Trash page:
-- db.programs.fetchDeleted filters by agency_id + deleted=true and orders by deleted_at desc.
create index if not exists idx_programs_agency_deleted_deleted_at
  on public.programs (agency_id, deleted, deleted_at desc);

-- Clients page:
-- db.clients.fetchAll filters by agency_id + active deleted flag and orders by registration_date.
create index if not exists idx_clients_agency_deleted_registration
  on public.clients (agency_id, deleted, registration_date);

-- Program detail and future paginated program client queries:
-- clients are commonly grouped/filtered by program within the same agency.
create index if not exists idx_clients_agency_program_deleted
  on public.clients (agency_id, program_id, deleted);

-- Client archive/trash workflows:
-- existing idx_clients_archived covers (agency_id, archived); this also helps
-- views that need active/non-deleted archived filtering.
create index if not exists idx_clients_agency_archived_deleted
  on public.clients (agency_id, archived, deleted);

-- Trash page:
-- db.clients.fetchDeleted filters by agency_id + deleted=true and orders by deleted_at desc.
create index if not exists idx_clients_agency_deleted_deleted_at
  on public.clients (agency_id, deleted, deleted_at desc);

-- Payments loading and trash:
-- db.payments.fetchAll filters by agency_id + status and orders by created_at.
create index if not exists idx_payments_agency_status_created
  on public.payments (agency_id, status, created_at);

-- Client detail, invoice validation, and client payment summaries:
-- payments are frequently filtered by agency/client/status and sorted by payment date.
create index if not exists idx_payments_agency_client_status_date
  on public.payments (agency_id, client_id, status, date);

-- Payment trash:
-- db.payments.fetchTrashed filters by agency_id + status='trashed' and orders by trashed_at/created_at.
create index if not exists idx_payments_agency_status_trashed_created
  on public.payments (agency_id, status, trashed_at desc, created_at desc);

-- Final invoices list:
-- db.invoices.fetch excludes deleted invoices and orders by issue_date/invoice_number.
create index if not exists idx_invoices_agency_active_issue_number
  on public.invoices (agency_id, issue_date desc, invoice_number desc)
  where status <> 'deleted';

-- Invoice trash:
-- db.invoices.fetchTrashed filters by agency_id + status='trashed' and orders by trashed_at/issue_date.
create index if not exists idx_invoices_agency_status_trashed_issue
  on public.invoices (agency_id, status, trashed_at desc, issue_date desc);

-- Notifications page/dropdown:
-- db.notifications.fetchAll filters by agency_id and orders newest first.
create index if not exists idx_notifications_agency_created
  on public.notifications (agency_id, created_at desc);

-- Notification unread/archive filters:
-- existing idx_notifications_state covers state filters; this version also supports newest-first ordering.
create index if not exists idx_notifications_agency_archived_read_created
  on public.notifications (agency_id, is_archived, is_read, created_at desc);

-- Activity log:
-- db.activityLog.fetchPage can filter by type and orders newest first.
create index if not exists idx_activity_agency_type_created
  on public.activity_log (agency_id, type, created_at desc);

-- Archived activity log:
-- activity_log_all can include archived activity and filter by type/newest first.
create index if not exists idx_activity_archive_agency_type_created
  on public.activity_log_archive (agency_id, type, created_at desc);
