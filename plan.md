# StudyTrack — Implementation Plan

## Product and scope

Build StudyTrack as a responsive React web application for student academic management. It will use Supabase Authentication and PostgreSQL, with the requested modules: dashboard, student profiles, subjects, topics, attendance, assignments, examinations, marks/performance, study planner/calendar, and settings. All statistics, charts, filters, and CRUD screens will use real Supabase records; a new account will see honest zero/empty states until it has data. The application will not include AI, chatbots, machine learning, automatic recommendations, or generated schedules.

## Implementation approach

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, accessible shadcn-style components, Lucide React, Recharts, and a compact calendar UI for daily/weekly/monthly study planning. Use a typed Supabase client and query-cache invalidation after mutations so screens refresh from persisted records.
- **Serving and configuration:** Run a small Express server on the initialized runtime port. In development it serves the Vite application; in production it serves the built frontend. A narrow `/api/public-config` endpoint returns only `SUPABASE_URL` and `SUPABASE_ANON_KEY` for browser initialization. It will never expose a Supabase service-role key. The initialized Manus server capability stays enabled; Manus's managed database remains disabled because Supabase is the explicit requested alternative.
- **Authentication and ownership:** Use Supabase email/password registration and sign-in, persistent Supabase sessions, protected application routes, and a profile-completion flow. Every application row is associated with an authenticated owner (`auth.uid()`), and RLS policies enforce that ownership. Related foreign keys and policies will prevent records from crossing account boundaries. No account receives organization-wide or admin access by default.
- **Database:** Add a versioned SQL migration under `supabase/migrations/` for the nine requested normalized tables (`students`, `subjects`, `student_subjects`, `topics`, `attendance`, `assignments`, `exams`, `study_sessions`, `marks`), with UUID keys, ownership, timestamps, foreign keys, uniqueness and validation checks, indexes, update-time triggers, and RLS policies. Store examination results in `marks` linked to the student, subject, and exam; assignment marks are retained with assignment data and surfaced in performance calculations. The app will provide helpful setup guidance if Supabase credentials are not configured.
- **Supabase setup constraint:** The public anon key is suitable for browser use only when RLS is enabled. The migration will be included in the project, but applying PostgreSQL DDL requires the project owner to run it once in the Supabase SQL Editor (the anon key cannot safely perform schema administration). Development and production Supabase values will be entered through the protected project-secret input, not placed in source files.
- **Demo seed data:** Include an explicit “Load sample data” action for evaluation. It will be opt-in, available only when the account workspace is empty, and create a clearly described starter dataset through ordinary authenticated Supabase inserts. Seeded records remain editable/deletable; dashboards and charts still calculate exclusively from database rows. Never silently seed or display fabricated totals.

## Project structure

- `src/app/` — app shell, route definitions, session handling, and protected-route behavior.
- `src/components/` — shared navigation, page headers, data tables, form/dialog primitives, state and empty-state components.
- `src/features/` — focused modules for dashboard, students, subjects/topics, attendance, assignments, exams/marks, planner, and settings.
- `src/lib/` — typed Supabase client/config loading, validation, formatting, queries, and shared utilities.
- `server/` — Express/Vite development serving, production static serving, and the minimal public runtime-config endpoint.
- `supabase/migrations/` — normalized PostgreSQL schema, constraints, triggers, and RLS policies.
- `public/manus-routes.json` — complete page-route manifest, synchronized with the React routes.

## Design direction

- **Alternatives considered:** Kinetic campus-zine layout (7%), quiet library index-card system (5%), and Swiss academic editorial workspace (3%).
- **Design movement:** restrained Swiss academic editorial, translated into a focused student workspace.
- **Core principles:** information first; clear academic hierarchy; honest data states; predictable, accessible controls.
- **Color philosophy:** paper-white surfaces and calm navy structure create a dependable study environment; the requested indigo accent signals active navigation and progress; status colors remain semantic and restrained.
- **Layout paradigm:** persistent left navigation beside a broad working canvas, with page-level headings and compact contextual summaries rather than oversized hero content. On small screens, navigation becomes a concise drawer and data views remain usable without horizontal overflow where practical.
- **Signature elements:** indigo progress markers/rings; precise fine dividers and rounded white panels; small monospaced identifiers and dates for an orderly academic-record feel.
- **Interaction philosophy:** direct forms, clear save/cancel actions, inline search/filtering, explicit destructive confirmations, visible loading/empty/success/error states, and keyboard-accessible navigation.
- **Animation:** restrained 120–160 ms transitions for drawer/dialog entry and hover/focus states only; no decorative motion; respect reduced-motion preferences.
- **Typography:** Inter for headings and interface text, with IBM Plex Mono for IDs, codes, and compact metadata. Use a consistent hierarchy of page title, section heading, body, and quiet metadata.
- **Brand essence:** an orderly academic command center for college students that brings coursework and planning into one reliable workspace; **clear, steady, practical**.
- **Brand voice:** concise and constructive, never gamified or inflated. Example lines: “Your week, in view.” “Attendance is below the 75% threshold in {subject}.”
- **Wordmark & logo:** a simple split-page ledger mark with an indigo checkstroke, paired with a custom StudyTrack wordmark treatment.
- **Signature brand color:** indigo `#4F46E5`.

## Material constraints and delivery

- This is a web application in the initialized WebDev project, not a separate native iOS/Android app. The attached brief asks for a responsive web application.
- A real Supabase project and its URL plus anon key are required for live authentication and data operations. The project can be completed with a clear configuration state before those values are supplied, but live Supabase behavior cannot be verified without them and the SQL migration must be applied in Supabase.
- Do not publish publicly unless explicitly requested. Use the project Preview for development and provide the migration/setup instructions with the completed app.
