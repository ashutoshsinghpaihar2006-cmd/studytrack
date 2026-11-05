import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlarmClock,
  ArrowUpRight,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  GraduationCap,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTableRows } from "../../components/CrudPage";
import {
  Button,
  InlineError,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../components/ui";
import { assignmentStatus, formatDate, percent, localISODate } from "../../lib/format";
import { buildAttendanceChart } from "../../lib/attendance-chart";
import { calculateSubjectPerformance } from "../../lib/performance";
import type { DbRow } from "../../lib/database.types";

function relativeActivityLabel(
  table: string,
  row: DbRow,
  studentMap: Map<string, string>,
  subjectMap: Map<string, string>,
  examMap: Map<string, string>
) {
  const student = studentMap.get(String(row.student_id)) ?? "A student";
  const subject = subjectMap.get(String(row.subject_id)) ?? "a subject";
  switch (table) {
    case "students":
      return `Student profile added: ${String(row.full_name ?? "Student")}`;
    case "subjects":
      return `Subject added: ${String(row.name ?? "Subject")}`;
    case "topics":
      return `Topic updated: ${String(row.name ?? "Topic")}`;
    case "attendance":
      return `${student} marked ${String(row.status).toLowerCase()} in ${subject}`;
    case "assignments":
      return `Assignment added: ${String(row.title ?? "Assignment")}`;
    case "exams":
      return `Exam scheduled: ${String(row.name ?? "Examination")}`;
    case "marks":
      return `Marks recorded for ${examMap.get(String(row.exam_id)) ?? "an examination"}`;
    case "study_sessions":
      return `Study session ${String(row.status).toLowerCase()} for ${subject}`;
    default:
      return "Academic record updated";
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [attendanceDays, setAttendanceDays] = useState<number>(7);

  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const attendance = useTableRows("attendance");
  const assignments = useTableRows("assignments");
  const exams = useTableRows("exams");
  const sessions = useTableRows("study_sessions");
  const marks = useTableRows("marks");
  const topics = useTableRows("topics");

  const allQueries = [
    students,
    subjects,
    attendance,
    assignments,
    exams,
    sessions,
    marks,
    topics,
  ];
  const loading = allQueries.some((query) => query.isLoading);
  const failed = allQueries.find((query) => query.isError);

  const studentRows = students.data ?? [];
  const subjectRows = subjects.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const assignmentRows = assignments.data ?? [];
  const examRows = exams.data ?? [];
  const sessionRows = sessions.data ?? [];
  const markRows = marks.data ?? [];
  const topicRows = topics.data ?? [];

  const subjectMap = useMemo(
    () => new Map(subjectRows.map((row) => [String(row.id), String(row.name)])),
    [subjectRows]
  );
  const studentMap = useMemo(
    () => new Map(studentRows.map((row) => [String(row.id), String(row.full_name)])),
    [studentRows]
  );
  const examMap = useMemo(
    () => new Map(examRows.map((row) => [String(row.id), String(row.name)])),
    [examRows]
  );

  const today = localISODate();
  const attended = attendanceRows.filter(
    (row) => row.status === "Present" || row.status === "Late"
  ).length;
  const attendanceRate = percent(attended, attendanceRows.length);
  const upcomingExams = examRows
    .filter((row) => String(row.exam_date ?? "") >= today)
    .sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)));
  const pendingAssignments = assignmentRows.filter(
    (row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted"
  );
  const completedSessions = sessionRows.filter((row) => row.status === "Completed").length;
  const attendanceChart = useMemo(
    () => buildAttendanceChart(attendanceRows, attendanceDays),
    [attendanceRows, attendanceDays]
  );
  const performance = useMemo(
    () => calculateSubjectPerformance(subjectRows, markRows, assignmentRows),
    [assignmentRows, markRows, subjectRows]
  );

  const activityItems = useMemo(() => {
    const groups: [string, DbRow[]][] = [
      ["students", studentRows],
      ["subjects", subjectRows],
      ["topics", topicRows],
      ["attendance", attendanceRows],
      ["assignments", assignmentRows],
      ["exams", examRows],
      ["marks", markRows],
      ["study_sessions", sessionRows],
    ];
    return groups
      .flatMap(([table, records]) =>
        records.map((row) => ({
          id: `${table}-${row.id}`,
          table,
          row,
          date: String(row.created_at ?? ""),
          text: relativeActivityLabel(table, row, studentMap, subjectMap, examMap),
        }))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [
    assignmentRows,
    attendanceRows,
    examRows,
    examMap,
    markRows,
    sessionRows,
    studentMap,
    studentRows,
    subjectMap,
    subjectRows,
    topicRows,
  ]);

  if (loading) return <LoadingState label="Loading live data from PostgreSQL…" />;
  if (failed)
    return (
      <InlineError
        message={
          failed.error instanceof Error
            ? failed.error.message
            : "Some dashboard records could not be loaded."
        }
        onRetry={() => void failed.refetch()}
      />
    );

  const hasAttendance = attendanceRows.length > 0;
  const hasPerformance = performance.length > 0;
  const nextDeadlines = [
    ...assignmentRows
      .filter((row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted")
      .map((row) => ({
        id: String(row.id),
        title: String(row.title),
        date: String(row.submission_deadline),
        kind: "Assignment",
        status: assignmentStatus(row.status, row.submission_deadline),
        detail: subjectMap.get(String(row.subject_id)) ?? "Subject",
      })),
    ...upcomingExams.map((row) => ({
      id: String(row.id),
      title: String(row.name),
      date: String(row.exam_date),
      kind: "Examination",
      status: "Upcoming",
      detail: subjectMap.get(String(row.subject_id)) ?? "Subject",
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Overview"
        title="Your week, in view."
        description="A real-time overview of coursework, attendance rates, exam milestones, and active study plans."
        action={
          <Link to="/planner">
            <Button variant="secondary" size="sm">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
              Open Study Planner
            </Button>
          </Link>
        }
      />

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Registered Students"
          value={studentRows.length}
          detail="Enrolled in your workspace"
          icon={<Users className="h-4 w-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Active Subjects"
          value={subjectRows.length}
          detail="Current academic courses"
          icon={<BookOpenCheck className="h-4 w-4" />}
          tone="blue"
        />
        <MetricCard
          label="Overall Attendance"
          value={`${attendanceRate}%`}
          detail={`${attended} attended · ${attendanceRows.length} total classes`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          tone={attendanceRows.length && attendanceRate < 75 ? "amber" : "green"}
        />
        <MetricCard
          label="Upcoming Exams"
          value={upcomingExams.length}
          detail="Scheduled examinations"
          icon={<GraduationCap className="h-4 w-4" />}
          tone="amber"
        />
        <MetricCard
          label="Pending Tasks"
          value={pendingAssignments.length}
          detail="Open & overdue coursework"
          icon={<AlarmClock className="h-4 w-4" />}
          tone={pendingAssignments.length ? "amber" : "green"}
        />
        <MetricCard
          label="Study Completed"
          value={completedSessions}
          detail="Sessions finished to date"
          icon={<CheckCheck className="h-4 w-4" />}
          tone="green"
        />
      </div>

      {/* Middle Row: Attendance Chart & Upcoming Deadlines */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel
          title="Attendance Trends"
          description={`Calculated presence rate across the last ${attendanceDays} days.`}
          action={
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 text-[11px]">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setAttendanceDays(d)}
                    className={`rounded-md px-2 py-0.5 font-medium transition active:scale-95 cursor-pointer ${
                      attendanceDays === d
                        ? "bg-white text-indigo-700 font-semibold shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/10 tabular-nums">
                {attendanceRows.length} logged
              </span>
            </div>
          }
        >
          {hasAttendance ? (
            <div className="h-[260px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={attendanceChart}
                  margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.07)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                    formatter={(value, _name, item) => [
                      `${value}% (${item.payload.classes} classes)`,
                      "Attendance",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fill="url(#attendanceFill)"
                    connectNulls={false}
                    activeDot={{ r: 5, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-slate-400">
              Attendance trends will render automatically after you log class records.
            </div>
          )}
        </Panel>

        <Panel
          title="Upcoming Deadlines"
          description="Immediate assessments and exams requiring attention."
          action={<CalendarClock className="h-4 w-4 text-slate-400" />}
        >
          {nextDeadlines.length ? (
            <div className="divide-y divide-slate-100">
              {nextDeadlines.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  <div
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${
                      item.kind === "Examination"
                        ? "bg-amber-50 text-amber-600 ring-amber-500/20"
                        : "bg-indigo-50 text-indigo-600 ring-indigo-500/20"
                    }`}
                  >
                    {item.kind === "Examination" ? (
                      <GraduationCap className="h-4 w-4" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-ink">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                      {item.detail} · {formatDate(item.date)}
                    </div>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-slate-400">
              No upcoming exams or open assignment deadlines.
            </div>
          )}
        </Panel>
      </div>

      {/* Bottom Row: Marks Distribution & Recent Activity */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Subject-wise Performance"
          description="Average score distribution from examinations and scored coursework."
          action={
            <Link
              to="/marks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all"
            >
              Full Details <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {hasPerformance ? (
            <div className="h-[250px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performance}
                  margin={{ top: 10, right: 12, left: -20, bottom: 4 }}
                >
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    tick={{ fill: "#64748b", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.07)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                    formatter={(value) => [`${value}%`, "Performance"]}
                    labelFormatter={(label) =>
                      performance.find((item) => item.subject === label)?.name ?? label
                    }
                  />
                  <Bar
                    dataKey="percentage"
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-slate-400">
              Performance statistics will appear as exam or assignment marks are recorded.
            </div>
          )}
        </Panel>

        <Panel
          title="Recent Academic Activity"
          description="Audit trail of recent records logged to your database."
          action={<Activity className="h-4 w-4 text-slate-400" />}
        >
          {activityItems.length ? (
            <div className="divide-y divide-slate-100">
              {activityItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      index === 0 ? "bg-indigo-600 ring-2 ring-indigo-100" : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium leading-relaxed text-slate-700">
                      {item.text}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400 tabular-nums">
                      {formatDate(item.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-slate-400">
              Recent academic updates will display here as you interact with StudyTrack.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
