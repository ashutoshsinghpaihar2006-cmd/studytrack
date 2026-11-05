import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BookMarked, CalendarCheck2, ChartNoAxesCombined } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/providers";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { MetricCard, PageHeader, Panel, LoadingState, InlineError, StatusBadge, Button } from "../../components/ui";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";
import { formatDate, percent } from "../../lib/format";

const fields: FieldSpec[] = [
  { name: "student_code", label: "Student ID", required: true, placeholder: "e.g. ST-2026-014" },
  { name: "full_name", label: "Full Name", required: true, placeholder: "Student name" },
  { name: "email", label: "Email", kind: "email", required: true, placeholder: "student@college.edu" },
  { name: "phone", label: "Phone Number", kind: "tel", placeholder: "+1 555 0100" },
  { name: "course", label: "Course", required: true, placeholder: "B.Tech Computer Science" },
  { name: "department", label: "Department", required: true, placeholder: "Computer Science" },
  { name: "semester", label: "Semester", kind: "number", min: 1, max: 12, required: true },
  { name: "academic_year", label: "Academic Year", required: true, placeholder: "2025–2026" },
  { name: "enrollment_date", label: "Enrollment Date", kind: "date", required: true },
];

const columns: ColumnSpec[] = [
  {
    key: "student_code",
    label: "Student ID",
    render: (row) => (
      <span className="inline-flex items-center rounded-md bg-indigo-50/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/10">
        {String(row.student_code)}
      </span>
    ),
  },
  {
    key: "full_name",
    label: "Student",
    render: (row) => (
      <div>
        <Link
          className="font-semibold text-ink hover:text-indigo-600 transition-colors"
          to={`/students/${row.id}`}
        >
          {String(row.full_name)}
        </Link>
        <div className="font-mono text-[11px] text-slate-400">
          {String(row.email ?? "")}
        </div>
      </div>
    ),
  },
  { key: "course", label: "Course" },
  {
    key: "semester",
    label: "Semester",
    render: (row) => (
      <span className="font-medium text-slate-700 tabular-nums">
        Sem {String(row.semester)}
      </span>
    ),
  },
  { key: "academic_year", label: "Academic year" },
  {
    key: "enrollment_date",
    label: "Enrolled",
    render: (row) => (
      <span className="tabular-nums text-slate-600">
        {formatDate(row.enrollment_date)}
      </span>
    ),
  },
];

export function StudentsPage() {
  const { role } = useAuth();
  return (
    <CrudPage
      title="Students"
      eyebrow="Student Directory"
      description="Manage enrolled student records and view individual academic trajectories."
      table="students"
      fields={fields}
      columns={columns}
      searchKeys={["student_code", "full_name", "email", "course", "department", "academic_year"]}
      emptyTitle="No student profiles yet"
      emptyMessage="Add a student profile to connect courses, class attendance, and examination marks."
      addLabel="Add student"
      readOnly={role !== "admin"}
    />
  );
}

export function StudentProfilePage() {
  const { id = "" } = useParams();
  const { client, user } = useAuth();
  const profile = useQuery({
    queryKey: ["student", user?.id ?? "signed-out", id],
    enabled: Boolean(client && user && id),
    queryFn: async () => {
      if (!client || !user) throw new Error("Sign in to access student profiles.");
      const { data, error } = await client.from("students").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
  });

  const attendance = useTableRows("attendance");
  const marks = useTableRows("marks");
  const enrollments = useTableRows("student_subjects");
  const subjects = useTableRows("subjects");

  const studentAttendance = (attendance.data ?? []).filter((row) => row.student_id === id);
  const attended = studentAttendance.filter((row) => row.status === "Present" || row.status === "Late").length;
  const studentMarks = (marks.data ?? []).filter((row) => row.student_id === id);
  const scored = studentMarks.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0);
  const maximum = studentMarks.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
  const subjectIds = (enrollments.data ?? []).filter((row) => row.student_id === id).map((row) => row.subject_id);
  const studentSubjects = (subjects.data ?? []).filter((row) => subjectIds.includes(row.id));

  const subjectPerformance = studentSubjects.map((subject) => {
    const results = studentMarks.filter((mark) => mark.subject_id === subject.id);
    const obtained = results.reduce((sum, mark) => sum + Number(mark.obtained_marks ?? 0), 0);
    const max = results.reduce((sum, mark) => sum + Number(mark.maximum_marks ?? 0), 0);
    return {
      subject,
      results: results.length,
      obtained,
      maximum: max,
      percentage: max ? percent(obtained, max) : 0,
    };
  });

  if (profile.isLoading) return <LoadingState label="Loading student profile…" />;
  if (profile.isError || !profile.data)
    return (
      <div className="space-y-4">
        <InlineError
          message={
            profile.error instanceof Error
              ? profile.error.message
              : "This student profile could not be loaded."
          }
        />
        <Link to="/students">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to students
          </Button>
        </Link>
      </div>
    );

  const student = profile.data;
  const details = [
    ["Student ID", student.student_code],
    ["Email", student.email],
    ["Phone", student.phone],
    ["Course", student.course],
    ["Department", student.department],
    ["Semester", `Semester ${student.semester ?? "—"}`],
    ["Academic year", student.academic_year],
    ["Enrollment date", formatDate(student.enrollment_date)],
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All students
      </Link>
      <PageHeader
        eyebrow="Student Profile"
        title={String(student.full_name)}
        description="Comprehensive academic profile and course performance record."
        action={
          <Link to="/marks">
            <Button variant="secondary" size="sm">
              View All Marks
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Attendance Rate"
          value={`${percent(attended, studentAttendance.length)}%`}
          detail={`${attended} attended of ${studentAttendance.length} classes`}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone={percent(attended, studentAttendance.length) < 75 ? "amber" : "green"}
        />
        <MetricCard
          label="Enrolled Courses"
          value={studentSubjects.length}
          detail="Active subject allocations"
          icon={<BookMarked className="h-4 w-4" />}
          tone="blue"
        />
        <MetricCard
          label="Average Score"
          value={maximum ? `${percent(scored, maximum)}%` : "—"}
          detail={`${studentMarks.length} recorded exam grades`}
          icon={<ChartNoAxesCombined className="h-4 w-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Academic Standing"
          value={student.academic_year ? String(student.academic_year) : "—"}
          detail={`Semester ${String(student.semester ?? "—")}`}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Student Information"
          description="Institutional profile stored in PostgreSQL."
        >
          <div className="grid gap-x-8 sm:grid-cols-2 divide-y divide-slate-100 sm:divide-y-0">
            {details.map(([label, value]) => (
              <div
                key={String(label)}
                className="border-b border-slate-100 px-5 py-3.5 md:px-6"
              >
                <div className="eyebrow">{String(label)}</div>
                <div className="mt-1 text-sm font-semibold text-ink tabular-nums">
                  {value == null || value === "" ? "—" : String(value)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Assigned Subjects"
          description="Active student-to-subject enrollments."
        >
          <div className="divide-y divide-slate-100">
            {studentSubjects.length ? (
              studentSubjects.map((subject) => (
                <div
                  key={String(subject.id)}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {String(subject.name)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {String(subject.code)} · {String(subject.credits)} credits
                    </div>
                  </div>
                  <StatusBadge value={`Sem ${String(subject.semester)}`} />
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                No subject allocations found for this student.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Subject Performance"
        description="Calculated from recorded examination marks and assessments."
      >
        <div className="divide-y divide-slate-100">
          {subjectPerformance.length ? (
            subjectPerformance.map(
              ({ subject, results, obtained, maximum, percentage }) => (
                <div
                  key={String(subject.id)}
                  className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="min-w-44 flex-1">
                    <div className="text-sm font-semibold text-ink">
                      {String(subject.name)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {String(subject.code)} · {results} result
                      {results === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-900/5">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {maximum ? `${obtained} / ${maximum}` : "No marks"}
                  </div>
                  <div className="w-14 text-right font-mono text-xs font-bold text-indigo-700 tabular-nums">
                    {maximum ? `${percentage}%` : "—"}
                  </div>
                </div>
              )
            )
          ) : (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              Assign courses to this student to track individual performance.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
