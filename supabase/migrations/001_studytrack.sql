-- StudyTrack schema. Run once in the Supabase SQL Editor for your project.
create extension if not exists pgcrypto;

create or replace function public.studytrack_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_code text not null check (length(trim(student_code)) between 1 and 40),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null check (position('@' in email) > 1),
  phone text,
  course text not null,
  department text not null,
  semester smallint not null check (semester between 1 and 12),
  academic_year text not null,
  enrollment_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint students_owner_code_unique unique (owner_id, student_code),
  constraint students_owner_id_unique unique (owner_id, id)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  code text not null check (length(trim(code)) between 1 and 30),
  credits smallint not null check (credits between 0 and 30),
  semester smallint not null check (semester between 1 and 12),
  faculty text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subjects_owner_code_unique unique (owner_id, code),
  constraint subjects_owner_id_unique unique (owner_id, id)
);

create table public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null,
  subject_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_subjects_owner_student_fk foreign key (owner_id, student_id) references public.students(owner_id, id) on update cascade on delete cascade,
  constraint student_subjects_owner_subject_fk foreign key (owner_id, subject_id) references public.subjects(owner_id, id) on update cascade on delete cascade,
  constraint student_subjects_unique unique (owner_id, student_id, subject_id),
  constraint student_subjects_owner_id_unique unique (owner_id, id)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 140),
  description text,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed')),
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  date_completed date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint topics_owner_subject_fk foreign key (owner_id, subject_id) references public.subjects(owner_id, id) on update cascade on delete cascade,
  constraint topics_completion_date_check check ((status = 'Completed' and date_completed is not null) or (status <> 'Completed')),
  constraint topics_owner_id_subject_unique unique (owner_id, id, subject_id),
  constraint topics_owner_id_unique unique (owner_id, id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null,
  subject_id uuid not null,
  attendance_date date not null,
  status text not null check (status in ('Present', 'Absent', 'Late')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint attendance_enrollment_fk foreign key (owner_id, student_id, subject_id) references public.student_subjects(owner_id, student_id, subject_id) on update cascade on delete cascade,
  constraint attendance_once_per_day unique (owner_id, student_id, subject_id, attendance_date),
  constraint attendance_owner_id_unique unique (owner_id, id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  description text,
  assigned_date date not null default current_date,
  submission_deadline date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Submitted', 'Overdue')),
  marks_obtained numeric(8,2),
  maximum_marks numeric(8,2) not null default 100 check (maximum_marks > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assignments_owner_subject_fk foreign key (owner_id, subject_id) references public.subjects(owner_id, id) on update cascade on delete cascade,
  constraint assignments_marks_check check (marks_obtained is null or (marks_obtained >= 0 and marks_obtained <= maximum_marks)),
  constraint assignments_owner_id_unique unique (owner_id, id)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 160),
  exam_type text not null check (exam_type in ('Internal', 'Midterm', 'Practical', 'Final')),
  exam_date date not null,
  maximum_marks numeric(8,2) not null check (maximum_marks > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exams_owner_subject_fk foreign key (owner_id, subject_id) references public.subjects(owner_id, id) on update cascade on delete cascade,
  constraint exams_owner_id_subject_unique unique (owner_id, id, subject_id),
  constraint exams_owner_id_unique unique (owner_id, id)
);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null,
  subject_id uuid not null,
  exam_id uuid not null,
  maximum_marks numeric(8,2) not null check (maximum_marks > 0),
  obtained_marks numeric(8,2) not null check (obtained_marks >= 0 and obtained_marks <= maximum_marks),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marks_owner_student_fk foreign key (owner_id, student_id) references public.students(owner_id, id) on update cascade on delete cascade,
  constraint marks_owner_exam_subject_fk foreign key (owner_id, exam_id, subject_id) references public.exams(owner_id, id, subject_id) on update cascade on delete cascade,
  constraint marks_owner_student_subject_fk foreign key (owner_id, student_id, subject_id) references public.student_subjects(owner_id, student_id, subject_id) on update cascade on delete cascade,
  constraint marks_student_exam_unique unique (owner_id, student_id, exam_id),
  constraint marks_owner_id_unique unique (owner_id, id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null,
  subject_id uuid not null,
  topic_id uuid,
  study_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  notes text,
  status text not null default 'Planned' check (status in ('Planned', 'Completed', 'Missed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sessions_end_after_start check (end_time > start_time),
  constraint sessions_owner_enrollment_fk foreign key (owner_id, student_id, subject_id) references public.student_subjects(owner_id, student_id, subject_id) on update cascade on delete cascade,
  constraint sessions_owner_topic_subject_fk foreign key (owner_id, topic_id, subject_id) references public.topics(owner_id, id, subject_id) on update cascade on delete cascade,
  constraint sessions_owner_id_unique unique (owner_id, id)
);

create index students_owner_name_idx on public.students(owner_id, full_name);
create index subjects_owner_semester_idx on public.subjects(owner_id, semester);
create index topics_owner_subject_status_idx on public.topics(owner_id, subject_id, status);
create index attendance_owner_date_idx on public.attendance(owner_id, attendance_date desc);
create index assignments_owner_deadline_idx on public.assignments(owner_id, submission_deadline);
create index exams_owner_date_idx on public.exams(owner_id, exam_date);
create index marks_owner_student_idx on public.marks(owner_id, student_id);
create index sessions_owner_date_idx on public.study_sessions(owner_id, study_date);

-- Keep updated_at reliable for every mutable table.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['students','subjects','student_subjects','topics','attendance','assignments','exams','marks','study_sessions'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.studytrack_set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

-- All application rows are isolated by the authenticated Supabase user.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['students','subjects','student_subjects','topics','attendance','assignments','exams','marks','study_sessions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (owner_id = auth.uid())', table_name || '_owner_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (owner_id = auth.uid())', table_name || '_owner_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', table_name || '_owner_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (owner_id = auth.uid())', table_name || '_owner_delete', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
