# StudyTrack — TODO

Status key: `[ ]` open · `[x]` complete after evidence of the outcome.

## 1. Supabase authentication, student profiles, and access control — [ ]

- Provide login and registration pages using secure Supabase Authentication.
- Protect application routes and maintain authenticated sessions.
- Maintain student academic profiles with Student ID, Full Name, Email, Phone Number, Course, Department, Semester, Academic Year, and Enrollment Date.
- Enforce user-specific data access with Row Level Security (RLS); ensure students can only access their permitted records.
- Validate user inputs and enforce account ownership across related records.
- Keep the Supabase service-role key out of the browser; use only the project URL and public anon key at runtime.

## 2. Main dashboard — [ ]

- Display the total registered students, total subjects, overall attendance percentage, upcoming examinations, pending assignments, completed study sessions, and recent academic activities.
- Include an attendance overview chart, subject-wise marks chart, upcoming deadlines section, and recent activity section.
- Use real database data rather than static dummy numbers. Dashboard statistics and charts must be calculated from Supabase records, including any records deliberately inserted through the opt-in sample-data action.

## 3. Student management — [ ]

- Store Student ID, Full Name, Email, Phone Number, Course, Department, Semester, Academic Year, and Enrollment Date.
- Support adding a student, editing student details, deleting records safely, viewing a student profile, searching and filtering students, and viewing individual academic performance.

## 4. Subject management — [ ]

- Store Subject ID, Subject Name, Subject Code, Credits, Semester, Assigned Faculty, and Description.
- Support adding, editing, and deleting subjects; assigning subjects to students; viewing subject details; and displaying subject-wise performance.

## 5. Topic management — [ ]

- Store Topic ID, Subject ID, Topic Name, Description, Completion Status (`Not Started`, `In Progress`, `Completed`), Difficulty Level, and Date Completed.
- Support adding and managing topics, updating topic completion status, filtering topics by subject and completion status, and displaying topic completion progress.

## 6. Attendance management — [ ]

- Store Attendance ID, Student ID, Subject ID, Date, and Status (`Present`, `Absent`, `Late`).
- Support marking daily attendance, editing attendance records, viewing attendance history, calculating subject-wise attendance percentage, and displaying overall attendance percentage.
- Highlight subjects with attendance below 75%.

## 7. Assignment management — [ ]

- Store Assignment ID, Subject ID, Assignment Title, Description, Assigned Date, Submission Deadline, Status (`Pending`, `Submitted`, `Overdue`), and Marks Obtained.
- Support creating assignments, updating assignment details, marking assignments as submitted, tracking pending and overdue assignments, and viewing assignment history.

## 8. Examination management — [ ]

- Store Exam ID, Subject ID, Exam Name, Exam Type (`Internal`, `Midterm`, `Practical`, `Final`), Exam Date, Maximum Marks, and Obtained Marks.
- Support adding and managing examinations, viewing upcoming exams, recording examination results, viewing examination history, and calculating subject-wise percentages.

## 9. Marks and performance — [ ]

- Record marks for different examinations and allow editing of marks.
- Calculate total and percentage marks.
- Display subject-wise performance and overall academic performance.
- Display charts comparing subject marks.

## 10. Manual study planner — [ ]

- Store Session ID, Student ID, Subject ID, Topic ID, Study Date, Start Time, End Time, Study Duration, Notes, and Status (`Planned`, `Completed`, `Missed`).
- Create study sessions manually; edit and delete sessions; and view daily, weekly, and monthly schedules in a calendar-based interface.
- Allow users to mark sessions as completed, track total study hours, and display completed versus planned sessions.
- Do not generate schedules or recommendations automatically.

## 11. Relational database, runtime connection, and demo seed data — [ ]

- Provide normalized PostgreSQL tables named `students`, `subjects`, `student_subjects`, `topics`, `attendance`, `assignments`, `exams`, `study_sessions`, and `marks`.
- Include primary keys for all tables; foreign key relationships; appropriate NOT NULL constraints; UNIQUE constraints where necessary; CHECK constraints for valid values; proper handling of deletion and updates; and `created_at` and `updated_at` timestamps.
- Maintain referential integrity and enforce ownership with RLS. Include the SQL migration and setup instructions for the external Supabase project.
- Connect the frontend to the configured Supabase project using the runtime URL and public anon key. Show an actionable configuration/setup state if credentials or the database migration are missing.
- Provide an explicit “Load sample data” action for evaluation. It must be opt-in and available only when the authenticated account workspace is empty. It must insert an explanatory starter dataset through ordinary authenticated Supabase database operations; inserted records must be editable/deletable. Never silently seed, invent dashboard statistics, or display fabricated database results.

## 12. Navigation, visual design, responsive layout, and state handling — [x]

- Provide navigation sections for Dashboard, Students, Subjects, Topics, Attendance, Assignments, Examinations, Marks & Performance, Study Planner, and Settings.
- Use a clean, modern, professional academic-management appearance; a light theme with white backgrounds; navy blue and indigo accent colours; rounded cards and subtle shadows; clear typography; and responsive layouts for desktop, tablet, and mobile.
- Keep tables, forms, dialogs, and navigation consistent. Avoid excessive animations, unnecessary gradients, and overly decorative elements.
- Make all navigation links work. Ensure all modules have proper loading, empty, success, and error states.

## 13. End-to-end application behavior and final delivery — [ ]

- Ensure all forms perform actual database insertions; edit operations update existing database records; and delete operations remove records safely.
- Ensure dashboard statistics are calculated from database records; charts use actual database data; search and filters work; and data persists after refreshing the application.
- Deliver a complete, working Student Academic Management & Study Planner application suitable for a B.Tech Computer Science college project evaluation. Prioritize database functionality, proper relational schema, CRUD operations, meaningful relationships, and a polished user interface.
- Before finishing, verify that every module works correctly and that the frontend is properly connected to the Supabase database.
- Do not add AI functionality, an AI chatbot, machine learning, automatic AI recommendations, or AI-generated schedules; features must use normal application logic, database operations, and user input.
