-- StudyTrack migration 003: Timetable and Google Classroom integration support
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  room text,
  auto_log boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint timetable_time_check check (end_time > start_time)
);

create index if not exists timetable_owner_day_idx on public.timetable_slots(owner_id, day_of_week);

-- Trigger for updated_at
drop trigger if exists timetable_slots_set_updated_at on public.timetable_slots;
create trigger timetable_slots_set_updated_at
  before update on public.timetable_slots
  for each row execute function public.studytrack_set_updated_at();

-- RLS
alter table public.timetable_slots enable row level security;
drop policy if exists timetable_slots_owner_select on public.timetable_slots;
create policy timetable_slots_owner_select on public.timetable_slots for select to authenticated using (owner_id = auth.uid());
drop policy if exists timetable_slots_owner_insert on public.timetable_slots;
create policy timetable_slots_owner_insert on public.timetable_slots for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists timetable_slots_owner_update on public.timetable_slots;
create policy timetable_slots_owner_update on public.timetable_slots for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists timetable_slots_owner_delete on public.timetable_slots;
create policy timetable_slots_owner_delete on public.timetable_slots for delete to authenticated using (owner_id = auth.uid());

grant select, insert, update, delete on public.timetable_slots to authenticated;
