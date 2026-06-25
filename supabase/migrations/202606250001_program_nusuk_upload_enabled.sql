-- Enable explicit per-program publishing to the Rukn Nusuk Assistant extension.
-- Default is false so existing programs do not appear in the extension until
-- an agency user chooses "رفع لنسك" from the Rukn UI.

alter table public.programs
  add column if not exists nusuk_upload_enabled boolean default false;

update public.programs
set nusuk_upload_enabled = false
where nusuk_upload_enabled is null;

alter table public.programs
  alter column nusuk_upload_enabled set default false,
  alter column nusuk_upload_enabled set not null;

create index if not exists idx_programs_agency_nusuk_upload_enabled
  on public.programs (agency_id, nusuk_upload_enabled)
  where coalesce(deleted, false) = false;
