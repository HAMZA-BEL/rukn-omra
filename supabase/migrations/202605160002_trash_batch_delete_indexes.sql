-- Performance indexes for batched Trash permanent-delete verification/cleanup.
-- No schema semantics are changed.

create index if not exists idx_invoices_client_agency
  on public.invoices (client_id, agency_id);

create index if not exists idx_notifications_agency_target_type_target
  on public.notifications (agency_id, target_type, target_id);
