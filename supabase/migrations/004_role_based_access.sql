-- ==============================================================================
-- Migration 004: Role-Based Access Control (Admin, Professor, Student)
-- Run this in your Supabase SQL Editor (Project: cxfviqyvhydhlrtpldqo)
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'professor', 'student')),
  approved boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Trigger for profiles updated_at
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.studytrack_set_updated_at();

-- 2. ALTER SUBJECTS & STUDENTS
alter table public.subjects
  add column if not exists professor_id uuid references public.profiles(id) on delete set null;

alter table public.students
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 3. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  content text not null check (length(trim(content)) >= 1),
  target_role text not null default 'all' check (target_role in ('all', 'student', 'professor')),
  subject_id uuid references public.subjects(id) on delete cascade,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.studytrack_set_updated_at();

-- 4. ACTIVITY / AUDIT LOG TABLE
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details text,
  created_at timestamptz not null default timezone('utc', now())
);

-- 5. TIMETABLE SLOTS TABLE (ensure created)
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
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

drop trigger if exists timetable_slots_set_updated_at on public.timetable_slots;
create trigger timetable_slots_set_updated_at
  before update on public.timetable_slots
  for each row execute function public.studytrack_set_updated_at();

-- 6. SECURITY DEFINER HELPER FUNCTIONS
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved = true
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and approved = true
  );
$$;

create or replace function public.is_professor()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'professor' and approved = true
  );
$$;

-- 7. USER REGISTRATION TRIGGER
-- Students: auto-approved (approved = true)
-- Professors: pending approval (approved = false)
-- Admin: cannot self-register; forced to student
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_role text;
  is_approved boolean;
  user_full_name text;
begin
  target_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  -- Prevent self-registering as admin
  if target_role = 'admin' then
    target_role := 'student';
  end if;

  if target_role not in ('professor', 'student') then
    target_role := 'student';
  end if;

  -- Professors require admin approval
  if target_role = 'professor' then
    is_approved := false;
  else
    is_approved := true;
  end if;

  insert into public.profiles (id, full_name, role, approved)
  values (new.id, user_full_name, target_role, is_approved)
  on conflict (id) do update set
    full_name = excluded.full_name;

  -- If student, also ensure student row has user_id linked if email matches
  update public.students set user_id = new.id where email = new.email and user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed existing auth users into profiles if any exist
insert into public.profiles (id, full_name, role, approved)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  case when coalesce(u.raw_user_meta_data->>'role', 'student') = 'admin' then 'admin'
       when coalesce(u.raw_user_meta_data->>'role', 'student') = 'professor' then 'professor'
       else 'student' end,
  true
from auth.users u
on conflict (id) do nothing;

-- 8. HELPER RPC: SEED / PROMOTE ADMIN
-- An admin can be promoted manually in SQL:
-- UPDATE public.profiles SET role = 'admin', approved = true WHERE id = '<user-id>';
create or replace function public.admin_set_user_role(target_user_id uuid, new_role text, new_approved boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: Only administrators can modify user roles.';
  end if;
  update public.profiles
  set role = new_role, approved = new_approved, updated_at = timezone('utc', now())
  where id = target_user_id;
end;
$$;

-- 9. LOG ACTIVITY HELPER
create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_details text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  u_name text;
begin
  select full_name into u_name from public.profiles where id = auth.uid();
  insert into public.activity_logs (user_id, user_name, action, entity_type, entity_id, details)
  values (auth.uid(), coalesce(u_name, 'User'), p_action, p_entity_type, p_entity_id, p_details);
end;
$$;

-- 10. ROW LEVEL SECURITY POLICIES

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.student_subjects enable row level security;
alter table public.topics enable row level security;
alter table public.attendance enable row level security;
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.marks enable row level security;
alter table public.study_sessions enable row level security;

-- PROFILES RLS
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

-- ANNOUNCEMENTS RLS
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_admin()
    or author_id = auth.uid()
    or target_role = 'all'
    or target_role = public.get_my_role()
  );

drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (public.is_admin() or public.is_professor());

drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements
  for update to authenticated
  using (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or author_id = auth.uid());

drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements
  for delete to authenticated
  using (public.is_admin() or author_id = auth.uid());

-- ACTIVITY LOGS RLS
drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- SUBJECTS RLS
-- Everyone authenticated can view subjects; Admin full CRUD; Professor can update assigned
drop policy if exists subjects_owner_select on public.subjects;
drop policy if exists subjects_role_select on public.subjects;
create policy subjects_role_select on public.subjects
  for select to authenticated
  using (true);

drop policy if exists subjects_owner_insert on public.subjects;
drop policy if exists subjects_role_insert on public.subjects;
create policy subjects_role_insert on public.subjects
  for insert to authenticated
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists subjects_owner_update on public.subjects;
drop policy if exists subjects_role_update on public.subjects;
create policy subjects_role_update on public.subjects
  for update to authenticated
  using (public.is_admin() or professor_id = auth.uid() or owner_id = auth.uid())
  with check (public.is_admin() or professor_id = auth.uid() or owner_id = auth.uid());

drop policy if exists subjects_owner_delete on public.subjects;
drop policy if exists subjects_role_delete on public.subjects;
create policy subjects_role_delete on public.subjects
  for delete to authenticated
  using (public.is_admin() or owner_id = auth.uid());

-- STUDENTS RLS
-- Admin: full CRUD. Professor: can view students. Student: can view own student record.
drop policy if exists students_owner_select on public.students;
drop policy if exists students_role_select on public.students;
create policy students_role_select on public.students
  for select to authenticated
  using (public.is_admin() or public.is_professor() or user_id = auth.uid() or owner_id = auth.uid());

drop policy if exists students_owner_insert on public.students;
drop policy if exists students_role_insert on public.students;
create policy students_role_insert on public.students
  for insert to authenticated
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists students_owner_update on public.students;
drop policy if exists students_role_update on public.students;
create policy students_role_update on public.students
  for update to authenticated
  using (public.is_admin() or user_id = auth.uid() or owner_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid() or owner_id = auth.uid());

drop policy if exists students_owner_delete on public.students;
drop policy if exists students_role_delete on public.students;
create policy students_role_delete on public.students
  for delete to authenticated
  using (public.is_admin() or owner_id = auth.uid());

-- STUDENT SUBJECTS RLS
drop policy if exists student_subjects_owner_select on public.student_subjects;
drop policy if exists student_subjects_role_select on public.student_subjects;
create policy student_subjects_role_select on public.student_subjects
  for select to authenticated
  using (
    public.is_admin()
    or public.is_professor()
    or student_id in (select id from public.students where user_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists student_subjects_owner_insert on public.student_subjects;
drop policy if exists student_subjects_role_insert on public.student_subjects;
create policy student_subjects_role_insert on public.student_subjects
  for insert to authenticated
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists student_subjects_owner_update on public.student_subjects;
drop policy if exists student_subjects_role_update on public.student_subjects;
create policy student_subjects_role_update on public.student_subjects
  for update to authenticated
  using (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists student_subjects_owner_delete on public.student_subjects;
drop policy if exists student_subjects_role_delete on public.student_subjects;
create policy student_subjects_role_delete on public.student_subjects
  for delete to authenticated
  using (public.is_admin() or owner_id = auth.uid());

-- TOPICS RLS
drop policy if exists topics_owner_select on public.topics;
drop policy if exists topics_role_select on public.topics;
create policy topics_role_select on public.topics
  for select to authenticated
  using (true);

drop policy if exists topics_owner_insert on public.topics;
drop policy if exists topics_role_insert on public.topics;
create policy topics_role_insert on public.topics
  for insert to authenticated
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists topics_owner_update on public.topics;
drop policy if exists topics_role_update on public.topics;
create policy topics_role_update on public.topics
  for update to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  )
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists topics_owner_delete on public.topics;
drop policy if exists topics_role_delete on public.topics;
create policy topics_role_delete on public.topics
  for delete to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

-- ATTENDANCE RLS
-- Admin & Professor: full CRUD. Student: read-only on own attendance.
drop policy if exists attendance_owner_select on public.attendance;
drop policy if exists attendance_role_select on public.attendance;
create policy attendance_role_select on public.attendance
  for select to authenticated
  using (
    public.is_admin()
    or public.is_professor()
    or student_id in (select id from public.students where user_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists attendance_owner_insert on public.attendance;
drop policy if exists attendance_role_insert on public.attendance;
create policy attendance_role_insert on public.attendance
  for insert to authenticated
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists attendance_owner_update on public.attendance;
drop policy if exists attendance_role_update on public.attendance;
create policy attendance_role_update on public.attendance
  for update to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  )
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists attendance_owner_delete on public.attendance;
drop policy if exists attendance_role_delete on public.attendance;
create policy attendance_role_delete on public.attendance
  for delete to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

-- ASSIGNMENTS RLS
-- Admin & Professor: CRUD. Student: read + update own status
drop policy if exists assignments_owner_select on public.assignments;
drop policy if exists assignments_role_select on public.assignments;
create policy assignments_role_select on public.assignments
  for select to authenticated
  using (true);

drop policy if exists assignments_owner_insert on public.assignments;
drop policy if exists assignments_role_insert on public.assignments;
create policy assignments_role_insert on public.assignments
  for insert to authenticated
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists assignments_owner_update on public.assignments;
drop policy if exists assignments_role_update on public.assignments;
create policy assignments_role_update on public.assignments
  for update to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
    -- Students can mark as submitted
    or (public.get_my_role() = 'student')
  )
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
    or (public.get_my_role() = 'student')
  );

drop policy if exists assignments_owner_delete on public.assignments;
drop policy if exists assignments_role_delete on public.assignments;
create policy assignments_role_delete on public.assignments
  for delete to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

-- EXAMS RLS
drop policy if exists exams_owner_select on public.exams;
drop policy if exists exams_role_select on public.exams;
create policy exams_role_select on public.exams
  for select to authenticated
  using (true);

drop policy if exists exams_owner_insert on public.exams;
drop policy if exists exams_role_insert on public.exams;
create policy exams_role_insert on public.exams
  for insert to authenticated
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists exams_owner_update on public.exams;
drop policy if exists exams_role_update on public.exams;
create policy exams_role_update on public.exams
  for update to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  )
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists exams_owner_delete on public.exams;
drop policy if exists exams_role_delete on public.exams;
create policy exams_role_delete on public.exams
  for delete to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

-- MARKS RLS
-- Admin & Professor: CRUD. Student: read-only on own marks
drop policy if exists marks_owner_select on public.marks;
drop policy if exists marks_role_select on public.marks;
create policy marks_role_select on public.marks
  for select to authenticated
  using (
    public.is_admin()
    or public.is_professor()
    or student_id in (select id from public.students where user_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists marks_owner_insert on public.marks;
drop policy if exists marks_role_insert on public.marks;
create policy marks_role_insert on public.marks
  for insert to authenticated
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists marks_owner_update on public.marks;
drop policy if exists marks_role_update on public.marks;
create policy marks_role_update on public.marks
  for update to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  )
  with check (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists marks_owner_delete on public.marks;
drop policy if exists marks_role_delete on public.marks;
create policy marks_role_delete on public.marks
  for delete to authenticated
  using (
    public.is_admin()
    or subject_id in (select id from public.subjects where professor_id = auth.uid() or owner_id = auth.uid())
    or owner_id = auth.uid()
  );

-- STUDY SESSIONS RLS
-- Student: full CRUD on own study sessions. Admin: view. Professor: view.
drop policy if exists sessions_owner_select on public.study_sessions;
drop policy if exists sessions_role_select on public.study_sessions;
create policy sessions_role_select on public.study_sessions
  for select to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or student_id in (select id from public.students where user_id = auth.uid())
  );

drop policy if exists sessions_owner_insert on public.study_sessions;
drop policy if exists sessions_role_insert on public.study_sessions;
create policy sessions_role_insert on public.study_sessions
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists sessions_owner_update on public.study_sessions;
drop policy if exists sessions_role_update on public.study_sessions;
create policy sessions_role_update on public.study_sessions
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists sessions_owner_delete on public.study_sessions;
drop policy if exists sessions_role_delete on public.study_sessions;
create policy sessions_role_delete on public.study_sessions
  for delete to authenticated
  using (owner_id = auth.uid());

-- TIMETABLE SLOTS RLS
drop policy if exists timetable_slots_owner_select on public.timetable_slots;
drop policy if exists timetable_slots_role_select on public.timetable_slots;
create policy timetable_slots_role_select on public.timetable_slots
  for select to authenticated
  using (true);

drop policy if exists timetable_slots_owner_insert on public.timetable_slots;
drop policy if exists timetable_slots_role_insert on public.timetable_slots;
create policy timetable_slots_role_insert on public.timetable_slots
  for insert to authenticated
  with check (public.is_admin() or public.is_professor() or owner_id = auth.uid());

drop policy if exists timetable_slots_owner_update on public.timetable_slots;
drop policy if exists timetable_slots_role_update on public.timetable_slots;
create policy timetable_slots_role_update on public.timetable_slots
  for update to authenticated
  using (public.is_admin() or public.is_professor() or owner_id = auth.uid())
  with check (public.is_admin() or public.is_professor() or owner_id = auth.uid());

drop policy if exists timetable_slots_owner_delete on public.timetable_slots;
drop policy if exists timetable_slots_role_delete on public.timetable_slots;
create policy timetable_slots_role_delete on public.timetable_slots
  for delete to authenticated
  using (public.is_admin() or public.is_professor() or owner_id = auth.uid());

-- Permissions
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
