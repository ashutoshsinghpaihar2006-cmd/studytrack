import { useMemo } from "react";
import { useTableRows, CrudPage } from "../../components/CrudPage";
import { MetricCard, Panel, StatusBadge } from "../../components/ui";
import { formatDate, percent } from "../../lib/format";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";
import { AlertTriangle, CalendarCheck2, UserRoundCheck } from "lucide-react";

export function AttendancePage() {
  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const attendance = useTableRows("attendance");
  const enrollments = useTableRows("student_subjects");
  const studentOptions = useMemo(() => (students.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.full_name)} · ${String(row.student_code)}` })), [students.data]);
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjects.data]);
  const studentMap = useMemo(() => new Map((students.data ?? []).map((row) => [String(row.id), String(row.full_name)])), [students.data]);
  const subjectMap = useMemo(() => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjects.data]);
  const fields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions, helper: "The student must be assigned to this subject first." },
    { name: "attendance_date", label: "Date", kind: "date", required: true },
    { name: "status", label: "Status", kind: "select", required: true, options: ["Present", "Absent", "Late"].map((value) => ({ value, label: value })) },
  ];
  const columns: ColumnSpec[] = [
    { key: "attendance_date", label: "Date", render: (row) => formatDate(row.attendance_date) },
    { key: "student_id", label: "Student", render: (row) => String(studentMap.get(String(row.student_id)) ?? "Unavailable") },
    { key: "subject_id", label: "Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
    { key: "status", label: "Status" },
  ];
  const records = attendance.data ?? [];
  const attended = records.filter((record) => record.status === "Present" || record.status === "Late").length;
  const overall = percent(attended, records.length);
  const grouped = (subjects.data ?? []).map((subject) => {
    const subjectRecords = records.filter((record) => record.subject_id === subject.id);
    const countAttended = subjectRecords.filter((record) => record.status === "Present" || record.status === "Late").length;
    return { subject, total: subjectRecords.length, value: percent(countAttended, subjectRecords.length) };
  }).filter((entry) => enrollments.data?.some((enrollment) => enrollment.subject_id === entry.subject.id));
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Overall attendance" value={`${overall}%`} detail={`${attended} present or late of ${records.length} classes`} icon={<CalendarCheck2 className="h-4 w-4" />} tone={overall < 75 && records.length ? "amber" : "green"} />
      <MetricCard label="Attendance records" value={records.length} detail="Saved in this account" icon={<UserRoundCheck className="h-4 w-4" />} tone="blue" />
      <MetricCard label="Below threshold" value={grouped.filter((entry) => entry.total > 0 && entry.value < 75).length} detail="Subjects below 75% attendance" icon={<AlertTriangle className="h-4 w-4" />} tone={grouped.some((entry) => entry.total > 0 && entry.value < 75) ? "amber" : "indigo"} />
    </div>
    <Panel title="Subject attendance" description="Late arrivals count as attended. Subjects below 75% are highlighted.">
      {grouped.length ? <div className="divide-y divide-slate-100">{grouped.map(({ subject, total, value }) => <div key={String(subject.id)} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="min-w-36 flex-1"><div className="text-sm font-semibold text-ink">{String(subject.name)}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{String(subject.code)} · {total} attendance records</div></div><div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${value < 75 ? "bg-rose-500" : "bg-indigo-500"}`} style={{ width: `${value}%` }} /></div><div className={`w-12 text-right font-mono text-xs font-medium ${total && value < 75 ? "text-rose-600" : "text-slate-600"}`}>{total ? `${value}%` : "—"}</div>{total && value < 75 && <StatusBadge value="Below 75%" />}</div>)}</div> : <div className="px-5 py-8 text-center text-xs text-slate-400">Assign a subject to a student and record attendance to see subject percentages.</div>}
    </Panel>
    <CrudPage title="Attendance history" eyebrow="Daily tracking" description="Mark and edit attendance records by student and subject." table="attendance" fields={fields} columns={columns} searchKeys={[]} emptyTitle="No attendance recorded" emptyMessage="Add today's attendance. A student must be assigned to the subject before a record can be saved." addLabel="Mark attendance" />
  </div>;
}
