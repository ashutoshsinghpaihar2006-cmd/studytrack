import { useMemo } from "react";
import { AlertTriangle, ClipboardList, Clock3 } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { MetricCard } from "../../components/ui";
import { assignmentStatus, formatDate, localISODate } from "../../lib/format";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

export function AssignmentsPage() {
  const subjects = useTableRows("subjects");
  const assignments = useTableRows("assignments");
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjects.data]);
  const subjectMap = useMemo(() => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjects.data]);
  const fields: FieldSpec[] = [
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "title", label: "Assignment Title", required: true },
    { name: "description", label: "Description", kind: "textarea" },
    { name: "assigned_date", label: "Assigned Date", kind: "date", required: true },
    { name: "submission_deadline", label: "Submission Deadline", kind: "date", required: true },
    { name: "status", label: "Status", kind: "select", required: true, options: ["Pending", "Submitted", "Overdue"].map((value) => ({ value, label: value })) },
    { name: "marks_obtained", label: "Marks Obtained", kind: "number", min: 0, step: 0.5 },
    { name: "maximum_marks", label: "Maximum Marks", kind: "number", min: 0.01, step: 0.5, required: true, helper: "Set the denominator for assignment performance." },
  ];
  const columns: ColumnSpec[] = [
    { key: "title", label: "Assignment", render: (row) => <div><div className="font-semibold text-ink">{String(row.title)}</div><div className="mt-0.5 max-w-xs truncate text-[10px] text-slate-400">{String(row.description ?? "")}</div></div> },
    { key: "subject_id", label: "Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
    { key: "assigned_date", label: "Assigned", render: (row) => formatDate(row.assigned_date) },
    { key: "submission_deadline", label: "Deadline", render: (row) => formatDate(row.submission_deadline) },
    { key: "status", label: "Status", render: (row) => assignmentStatus(row.status, row.submission_deadline) },
    { key: "marks_obtained", label: "Marks", render: (row) => row.marks_obtained == null ? "—" : `${String(row.marks_obtained)} / ${String(row.maximum_marks)}` },
  ];
  const rows = assignments.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter((row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted");
  const overdue = rows.filter((row) => assignmentStatus(row.status, row.submission_deadline) === "Overdue");
  const upcoming = pending.filter((row) => String(row.submission_deadline ?? "") >= today).length;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Pending assignments" value={pending.length} detail="Not yet submitted" icon={<ClipboardList className="h-4 w-4" />} tone="indigo" />
      <MetricCard label="Overdue" value={overdue.length} detail="Past deadline and still open" icon={<AlertTriangle className="h-4 w-4" />} tone={overdue.length ? "amber" : "green"} />
      <MetricCard label="Upcoming deadlines" value={upcoming} detail="Due today or later" icon={<Clock3 className="h-4 w-4" />} tone="blue" />
    </div>
    <CrudPage title="Assignments" eyebrow="Coursework" description="Track each assignment from the assigned date through submission and marks." table="assignments" fields={fields} columns={columns} searchKeys={["title", "description", "status"]} emptyTitle="No assignments yet" emptyMessage="Add coursework and submission deadlines to keep them visible in your dashboard." addLabel="Add assignment" defaults={{ assigned_date: localISODate(), submission_deadline: localISODate(), status: "Pending", maximum_marks: 100 }} transformValues={(values) => ({ ...values, status: values.status === "Submitted" ? "Submitted" : (String(values.submission_deadline ?? "") < localISODate() ? "Overdue" : "Pending") })} />
  </div>;
}
