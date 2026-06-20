-- Keep Hajj travel-group assignments safe when a group is deleted.
-- Only travel_group_id is cleared; agency_id and program_id remain intact.

alter table public.clients
  drop constraint if exists clients_travel_group_same_program_fkey;

alter table public.clients
  add constraint clients_travel_group_same_program_fkey
  foreign key (agency_id, program_id, travel_group_id)
  references public.program_travel_groups (agency_id, program_id, id)
  on delete set null (travel_group_id);
