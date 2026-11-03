-- Optional evaluation dataset. Apply after 001_studytrack.sql.
-- Called by the signed-in user via Supabase RPC; never runs automatically.
create or replace function public.studytrack_load_sample_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_email text;
  v_student uuid;
  v_ds uuid;
  v_math uuid;
  v_db uuid;
  v_os uuid;
  v_exam_ds uuid;
  v_exam_db uuid;
  v_exam_os uuid;
begin
  if v_owner is null then
    raise exception 'Sign in before loading the sample dataset.' using errcode = '42501';
  end if;

  if exists (select 1 from public.students where owner_id = v_owner)
    or exists (select 1 from public.subjects where owner_id = v_owner)
    or exists (select 1 from public.student_subjects where owner_id = v_owner)
    or exists (select 1 from public.topics where owner_id = v_owner)
    or exists (select 1 from public.attendance where owner_id = v_owner)
    or exists (select 1 from public.assignments where owner_id = v_owner)
    or exists (select 1 from public.exams where owner_id = v_owner)
    or exists (select 1 from public.study_sessions where owner_id = v_owner)
    or exists (select 1 from public.marks where owner_id = v_owner) then
    raise exception 'Sample data is available only when your StudyTrack workspace is empty.' using errcode = 'P0001';
  end if;

  select email into v_email from auth.users where id = v_owner;
  if v_email is null then v_email := 'sample@student.local'; end if;

  insert into public.students (owner_id, student_code, full_name, email, phone, course, department, semester, academic_year, enrollment_date)
  values (v_owner, 'DEMO-ST-001', 'Sample Student', v_email, null, 'B.Tech Computer Science', 'Computer Science', 4,
    format('%s–%s', extract(year from current_date)::integer, extract(year from current_date)::integer + 1), current_date - 90)
  returning id into v_student;

  insert into public.subjects (owner_id, name, code, credits, semester, faculty, description)
  values (v_owner, 'Data Structures', 'CS201', 4, 3, 'Dr. Rao', 'Core structures, complexity, and algorithmic problem solving.') returning id into v_ds;
  insert into public.subjects (owner_id, name, code, credits, semester, faculty, description)
  values (v_owner, 'Discrete Mathematics', 'MA203', 4, 3, 'Prof. Sen', 'Logic, relations, graphs, and proof techniques.') returning id into v_math;
  insert into public.subjects (owner_id, name, code, credits, semester, faculty, description)
  values (v_owner, 'Database Systems', 'CS301', 3, 4, 'Dr. Iyer', 'Relational design, SQL, and transaction fundamentals.') returning id into v_db;
  insert into public.subjects (owner_id, name, code, credits, semester, faculty, description)
  values (v_owner, 'Operating Systems', 'CS303', 3, 4, 'Prof. Kapoor', 'Processes, memory, concurrency, and system interfaces.') returning id into v_os;

  insert into public.student_subjects (owner_id, student_id, subject_id) values
    (v_owner, v_student, v_ds), (v_owner, v_student, v_math), (v_owner, v_student, v_db), (v_owner, v_student, v_os);

  insert into public.topics (owner_id, subject_id, name, description, status, difficulty, date_completed) values
    (v_owner, v_ds, 'Arrays and Linked Lists', 'Compare sequential and linked storage.', 'Completed', 'Medium', current_date - 7),
    (v_owner, v_ds, 'Trees and Traversals', 'Binary trees, traversal orders, and search trees.', 'In Progress', 'Hard', null),
    (v_owner, v_math, 'Propositional Logic', 'Statements, equivalence, and inference.', 'Completed', 'Easy', current_date - 5),
    (v_owner, v_math, 'Graph Theory', 'Paths, connectivity, and basic graph properties.', 'Not Started', 'Medium', null),
    (v_owner, v_db, 'Relational Algebra', 'Selection, projection, and join operations.', 'In Progress', 'Medium', null),
    (v_owner, v_db, 'Normalization', 'Functional dependencies and normal forms.', 'Not Started', 'Hard', null),
    (v_owner, v_os, 'Process Scheduling', 'Scheduling goals and common algorithms.', 'Completed', 'Medium', current_date - 3),
    (v_owner, v_os, 'Virtual Memory', 'Address translation and page replacement.', 'Not Started', 'Hard', null);

  insert into public.attendance (owner_id, student_id, subject_id, attendance_date, status)
  select v_owner, v_student, subjects.subject_id, current_date - days.day_offset,
    case when (days.day_offset + subjects.ordinal) % 11 = 0 then 'Absent'
         when (days.day_offset + subjects.ordinal) % 7 = 0 then 'Late'
         else 'Present' end
  from (values (v_ds, 1), (v_math, 2), (v_db, 3), (v_os, 4)) as subjects(subject_id, ordinal)
  cross join generate_series(1, 10) as days(day_offset);

  insert into public.assignments (owner_id, subject_id, title, description, assigned_date, submission_deadline, status, marks_obtained, maximum_marks) values
    (v_owner, v_ds, 'Tree traversal worksheet', 'Trace the three depth-first traversal orders for the supplied tree.', current_date - 10, current_date + 4, 'Pending', null, 20),
    (v_owner, v_db, 'Relational schema exercise', 'Normalize the library transaction schema and explain each decomposition.', current_date - 16, current_date - 2, 'Overdue', null, 25),
    (v_owner, v_os, 'Process scheduling lab', 'Compare turnaround time for the assigned scheduling cases.', current_date - 24, current_date - 12, 'Submitted', 18, 20);

  insert into public.exams (owner_id, subject_id, name, exam_type, exam_date, maximum_marks)
  values (v_owner, v_ds, 'Data Structures Midterm', 'Midterm', current_date - 6, 100) returning id into v_exam_ds;
  insert into public.exams (owner_id, subject_id, name, exam_type, exam_date, maximum_marks)
  values (v_owner, v_db, 'Database Systems Internal', 'Internal', current_date + 8, 25) returning id into v_exam_db;
  insert into public.exams (owner_id, subject_id, name, exam_type, exam_date, maximum_marks)
  values (v_owner, v_os, 'Operating Systems Practical', 'Practical', current_date + 18, 50) returning id into v_exam_os;

  insert into public.marks (owner_id, student_id, subject_id, exam_id, maximum_marks, obtained_marks) values
    (v_owner, v_student, v_ds, v_exam_ds, 100, 82);

  insert into public.study_sessions (owner_id, student_id, subject_id, topic_id, study_date, start_time, end_time, duration_minutes, notes, status)
  select v_owner, v_student, v_ds, topics.id, current_date - 1, '09:00', '10:15', 75, 'Review completed tree and list structures.', 'Completed'
  from public.topics topics where topics.owner_id = v_owner and topics.subject_id = v_ds and topics.name = 'Arrays and Linked Lists';
  insert into public.study_sessions (owner_id, student_id, subject_id, topic_id, study_date, start_time, end_time, duration_minutes, notes, status)
  select v_owner, v_student, v_db, topics.id, current_date - 3, '16:00', '17:00', 60, 'Worked through relational algebra examples.', 'Completed'
  from public.topics topics where topics.owner_id = v_owner and topics.subject_id = v_db and topics.name = 'Relational Algebra';
  insert into public.study_sessions (owner_id, student_id, subject_id, topic_id, study_date, start_time, end_time, duration_minutes, notes, status)
  select v_owner, v_student, v_ds, topics.id, current_date, '18:00', '19:30', 90, 'Continue the traversal exercises.', 'Planned'
  from public.topics topics where topics.owner_id = v_owner and topics.subject_id = v_ds and topics.name = 'Trees and Traversals';
  insert into public.study_sessions (owner_id, student_id, subject_id, topic_id, study_date, start_time, end_time, duration_minutes, notes, status)
  values (v_owner, v_student, v_os, null, current_date + 1, '08:30', '09:30', 60, 'Review process scheduling examples.', 'Planned');
  insert into public.study_sessions (owner_id, student_id, subject_id, topic_id, study_date, start_time, end_time, duration_minutes, notes, status)
  values (v_owner, v_student, v_math, null, current_date - 2, '14:00', '14:45', 45, 'Missed planned graph theory review.', 'Missed');

  return jsonb_build_object('students', 1, 'subjects', 4, 'topics', 8, 'attendance_records', 40, 'assignments', 3, 'exams', 3, 'marks', 1, 'study_sessions', 5);
end;
$$;

revoke all on function public.studytrack_load_sample_data() from public;
revoke all on function public.studytrack_load_sample_data() from anon;
grant execute on function public.studytrack_load_sample_data() to authenticated;
