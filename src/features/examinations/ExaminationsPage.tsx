import { useMemo } from "react";
import { AlertTriangle, CalendarDays, GraduationCap } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { useAuth } from "../../app/providers";
import { MetricCard } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

export function ExaminationsPage() {
  const { role } = useAuth();
  const subjects = useTableRows("subjects");
  const exams = useTableRows("exams");
  const marks = useTableRows("marks");
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjects.data]);
  const subjectMap = useMemo(() => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjects.data]);
  const fields: FieldSpec[] = [
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "name", label: "Exam Name", required: true },
    { name: "exam_type", label: "Exam Type", kind: "select", required: true, options: ["Internal", "Midterm", "Practical", "Final"].map((value) => ({ value, label: value })) },
    { name: "exam_date", label: "Exam Date", kind: "date", required: true },
    { name: "maximum_marks", label: "Maximum Marks", kind: "number", min: 0.01, step: 0.5, required: true },
  ];
  const columns: ColumnSpec[] = [
    { key: "name", label: "Examination", render: (row) => <div><div className="font-semibold text-ink">{String(row.name)}</div><div className="mt-0.5 text-[10px] text-slate-400">{String(row.exam_type)}</div></div> },
    { key: "subject_id", label: "Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
    { key: "exam_date", label: "Date", render: (row) => formatDate(row.exam_date) },
    { key: "maximum_marks", label: "Maximum marks" },
    { key: "obtained_marks", label: "Obtained marks", render: (row) => {
      const results = (marks.data ?? []).filter((mark) => mark.exam_id === row.id);
      if (!results.length) return <span className="text-slate-400">Not recorded</span>;
      const obtained = results.reduce((sum, mark) => sum + Number(mark.obtained_marks ?? 0), 0) / results.length;
      return <span className="font-medium text-ink">{obtained.toFixed(1)} avg <span className="text-[10px] text-slate-400">({results.length} result{results.length === 1 ? "" : "s"})</span></span>;
    } },
  ];
  const rows = exams.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((row) => String(row.exam_date ?? "") >= today).length;
  const results = marks.data ?? [];
  const average = results.length ? Math.round(results.reduce((sum, row) => sum + (Number(row.obtained_marks ?? 0) / Math.max(Number(row.maximum_marks ?? 1), 1)) * 100, 0) / results.length) : 0;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Upcoming exams" value={upcoming} detail="Scheduled from today onward" icon={<CalendarDays className="h-4 w-4" />} tone="indigo" />
      <MetricCard label="Examination records" value={rows.length} detail="Across your subjects" icon={<GraduationCap className="h-4 w-4" />} tone="blue" />
      <MetricCard label="Average recorded score" value={results.length ? `${average}%` : "—"} detail="Calculated from exam marks" icon={<AlertTriangle className="h-4 w-4" />} tone="green" />
    </div>
    <CrudPage title="Examinations" eyebrow="Exam schedule" description="Plan internal, midterm, practical, and final examinations, then record results in Marks & Performance." table="exams" fields={fields} columns={columns} searchKeys={["name", "exam_type"]} emptyTitle="No examinations scheduled" emptyMessage="Add an exam date and maximum marks to make it available for result recording." addLabel="Add examination"
      readOnly={role === "student"} />
  </div>;
}
