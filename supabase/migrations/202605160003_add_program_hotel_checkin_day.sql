-- Add program-level hotel check-in day choice.
-- Default keeps existing behavior: first hotel check-in is the day after departure.

alter table public.programs
  add column if not exists hotel_checkin_day text not null default 'next_day';

update public.programs
set hotel_checkin_day = 'next_day'
where hotel_checkin_day is null
   or hotel_checkin_day not in ('same_day', 'next_day');

alter table public.programs
  alter column hotel_checkin_day set default 'next_day';

alter table public.programs
  alter column hotel_checkin_day set not null;

alter table public.programs
  drop constraint if exists programs_hotel_checkin_day_check;

alter table public.programs
  add constraint programs_hotel_checkin_day_check
  check (hotel_checkin_day in ('same_day', 'next_day'));
