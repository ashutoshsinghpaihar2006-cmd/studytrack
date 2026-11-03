import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, AlarmClock, ArrowUpRight, BookOpenCheck, CalendarClock, CalendarDays, CheckCheck, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTableRows } from "../../components/CrudPage";
import { InlineError, LoadingState, MetricCard, PageHeader, Panel, StatusBadge } from "../../components/ui";
import { assignmentStatus, formatDate, percent, localISODate } from "../../lib/format";
import { buildAttendanceChart } from "../../lib/attendance-chart";
import { calculateSubjectPerformance } from "../../lib/performance";
import type { DbRow } from "../../lib/database.types";

function relativeActivityLabel(table: string, row: DbRow, studentMap: Map<string, string>, subjectMap: Map<string, string>, examMap: Map<string, string>) {
  const student = studentMap.get(String(row.student_id)) ?? "A student";
  const subject = subjectMap.get(String(row.subject_id)) ?? "a subject";
  switch (table) {
    case "students": return `Student profile added: ${String(row.full_name ?? "Student")}`;
    case "subjects": return `Subject added: ${String(row.name ?? "Subject")}`;
    case "topics": return `Topic updated: ${String(row.name ?? "Topic")}`;
    case "attendance": return `${student} marked ${String(row.status).toLowerCase()} in ${subject}`;
    case "assignments": return `Assignment added: ${String(row.title ?? "Assignment")}`;
    case "exams": return `Exam scheduled: ${String(row.name ?? "Examination")}`;
    case "marks": return `Marks recorded for ${examMap.get(String(row.exam_id)) ?? "an examination"}`;
    case "study_sessions": return `Study session ${String(row.status).toLowerCase()} for ${subject}`;
    default: return "Academic record updated";
  }
}

export function DashboardPage() {
  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const attendance = useTableRows("attendance");
  const assignments = useTableRows("assignments");
  const exams = useTableRows("exams");
  const sessions = useTableRows("study_sessions");
  const marks = useTableRows("marks");
  const topics = useTableRows("topics");
  const allQueries = [students, subjects, attendance, assignments, exams, sessions, marks, topics];
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
  const subjectMap = useMemo(() => new Map(subjectRows.map((row) => [String(row.id), String(row.name)])), [subjectRows]);
  const studentMap = useMemo(() => new Map(studentRows.map((row) => [String(row.id), String(row.full_name)])), [studentRows]);
  const examMap = useMemo(() => new Map(examRows.map((row) => [String(row.id), String(row.name)])), [examRows]);
  const today = localISODate();
  const attended = attendanceRows.filter((row) => row.status === "Present" || row.status === "Late").length;
  const attendanceRate = percent(attended, attendanceRows.length);
  const upcomingExams = examRows.filter((row) => String(row.exam_date ?? "") >= today).sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)));
  const pendingAssignments = assignmentRows.filter((row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted");
  const completedSessions = sessionRows.filter((row) => row.status === "Completed").length;
  const attendanceChart = useMemo(() => buildAttendanceChart(attendanceRows), [attendanceRows]);
  const performance = useMemo(() => calculateSubjectPerformance(subjectRows, markRows, assignmentRows), [assignmentRows, markRows, subjectRows]);

  const activityItems = useMemo(() => {
    const groups: [string, DbRow[]][] = [["students", studentRows], ["subjects", subjectRows], ["topics", topicRows], ["attendance", attendanceRows], ["assignments", assignmentRows], ["exams", examRows], ["marks", markRows], ["study_sessions", sessionRows]];
    return groups.flatMap(([table, records]) => records.map((row) => ({ id: `${table}-${row.id}`, table, row, date: String(row.created_at ?? ""), text: relativeActivityLabel(table, row, studentMap, subjectMap, examMap) }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [assignmentRows, attendanceRows, examRows, examMap, markRows, sessionRows, studentMap, studentRows, subjectMap, subjectRows, topicRows]);

  if (loading) return <LoadingState label="Loading your live academic data…" />;
  if (failed) return <InlineError message={failed.error instanceof Error ? failed.error.message : "Some dashboard records could not be loaded."} onRetry={() => void failed.refetch()} />;
  const hasAttendance = attendanceRows.length > 0;
  const hasPerformance = performance.length > 0;
  const nextDeadlines = [
    ...assignmentRows.filter((row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted").map((row) => ({ id: String(row.id), title: String(row.title), date: String(row.submission_deadline), kind: "Assignment", status: assignmentStatus(row.status, row.submission_deadline), detail: subjectMap.get(String(row.subject_id)) ?? "Subject" })),
    ...upcomingExams.map((row) => ({ id: String(row.id), title: String(row.name), date: String(row.exam_date), kind: "Examination", status: "Upcoming", detail: subjectMap.get(String(row.subject_id)) ?? "Subject" })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  return <div className="space-y-6">
    <PageHeader eyebrow="Academic overview" title="Your week, in view." description="A clear read on your coursework, attendance, and study time." action={<Link to="/planner" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"><CalendarDays className="h-4 w-4" />Open study planner</Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <MetricCard label="Registered students" value={studentRows.length} detail="Profiles in your workspace" icon={<Users className="h-4 w-4" />} tone="indigo" />
      <MetricCard label="Subjects" value={subjectRows.length} detail="Current subject records" icon={<BookOpenCheck className="h-4 w-4" />} tone="blue" />
      <MetricCard label="Overall attendance" value={`${attendanceRate}%`} detail={`${attended} present or late · ${attendanceRows.length} records`} icon={<ClipboardCheck className="h-4 w-4" />} tone={attendanceRows.length && attendanceRate < 75 ? "amber" : "green"} />
      <MetricCard label="Upcoming exams" value={upcomingExams.length} detail="Scheduled from today onward" icon={<GraduationCap className="h-4 w-4" />} tone="amber" />
      <MetricCard label="Pending assignments" value={pendingAssignments.length} detail="Includes overdue coursework" icon={<AlarmClock className="h-4 w-4" />} tone={pendingAssignments.length ? "amber" : "green"} />
      <MetricCard label="Completed sessions" value={completedSessions} detail="Study sessions marked complete" icon={<CheckCheck className="h-4 w-4" />} tone="green" />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel title="Attendance overview" description="Daily attendance for the last seven days, calculated from saved records." action={<span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">{attendanceRows.length} records</span>}>
        {hasAttendance ? <div className="h-[250px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attendanceChart} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.13} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value, _name, item) => [`${value}% · ${item.payload.classes} classes`, "Attendance"]} /><Area type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2.5} fill="url(#attendanceFill)" connectNulls={false} activeDot={{ r: 4, fill: "#4f46e5", stroke: "white", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div> : <div className="px-5"><div className="py-12 text-center text-xs text-slate-400">Attendance trends will appear after you mark class records.</div></div>}
      </Panel>
      <Panel title="Upcoming deadlines" description="Nearest assignments and examinations." action={<CalendarClock className="h-4 w-4 text-slate-400" />}>
        {nextDeadlines.length ? <div className="divide-y divide-slate-100">{nextDeadlines.map((item) => <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 px-5 py-4"><div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind === "Examination" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>{item.kind === "Examination" ? <GraduationCap className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[10px] text-slate-400">{item.detail} · {formatDate(item.date)}</div></div><StatusBadge value={item.status} /></div>)}</div> : <div className="px-5"><div className="py-12 text-center text-xs text-slate-400">No upcoming examinations or open assignment deadlines.</div></div>}
      </Panel>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Subject-wise marks" description="Average score percentages from exam and assignment results." action={<Link to="/marks" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">View results <ArrowUpRight className="inline h-3.5 w-3.5" /></Link>}>
        {hasPerformance ? <div className="h-[245px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={performance} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, "Performance"]} labelFormatter={(label) => performance.find((item) => item.subject === label)?.name ?? label} /><Bar dataKey="percentage" fill="#4f46e5" radius={[7, 7, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div> : <div className="px-5"><div className="py-12 text-center text-xs text-slate-400">Marks comparisons appear after you record an exam result or assignment score.</div></div>}
      </Panel>
      <Panel title="Recent academic activity" description="Latest records saved in your workspace." action={<Activity className="h-4 w-4 text-slate-400" />}>
        {activityItems.length ? <div className="divide-y divide-slate-100">{activityItems.map((item, index) => <div key={item.id} className="flex items-start gap-3 px-5 py-3.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 0 ? "bg-indigo-500" : "bg-slate-300"}`} /><div className="min-w-0 flex-1"><div className="text-xs font-medium leading-5 text-slate-700">{item.text}</div><div className="mt-0.5 text-[10px] text-slate-400">{formatDate(item.date)}</div></div></div>)}</div> : <div className="px-5"><div className="py-12 text-center text-xs text-slate-400">Your recent academic records will appear here once you start using StudyTrack.</div></div>}
      </Panel>
    </div>
  </div>;
}
