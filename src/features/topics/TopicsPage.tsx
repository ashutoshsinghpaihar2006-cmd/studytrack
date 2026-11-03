import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { PageHeader, Panel } from "../../components/ui";
import type { ColumnSpec, DbRow, FieldSpec } from "../../lib/database.types";
import { localISODate } from "../../lib/format";

export function TopicsPage() {
  const subjects = useTableRows("subjects");
  const topics = useTableRows("topics");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [selectedSubject, setSelectedSubject] = useState("All subjects");
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjects.data]);
  const subjectMap = useMemo(() => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjects.data]);
  const fields: FieldSpec[] = [
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "name", label: "Topic Name", required: true },
    { name: "description", label: "Description", kind: "textarea" },
    { name: "status", label: "Completion Status", kind: "select", required: true, options: ["Not Started", "In Progress", "Completed"].map((value) => ({ value, label: value })) },
    { name: "difficulty", label: "Difficulty Level", kind: "select", required: true, options: ["Easy", "Medium", "Hard"].map((value) => ({ value, label: value })) },
    { name: "date_completed", label: "Date Completed", kind: "date", helper: "Set when completed; StudyTrack adds today's date if left blank." },
  ];
  const columns: ColumnSpec[] = [
    { key: "name", label: "Topic", render: (row) => <div><div className="font-semibold text-ink">{String(row.name)}</div><div className="mt-0.5 max-w-xs truncate text-[10px] text-slate-400">{String(row.description ?? "")}</div></div> },
    { key: "subject_id", label: "Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
    { key: "status", label: "Status" },
    { key: "difficulty", label: "Difficulty", render: (row) => <span className="text-xs">{String(row.difficulty)}</span> },
    { key: "date_completed", label: "Completed", render: (row) => row.date_completed ? String(row.date_completed) : "—" },
  ];
  const topicRows = topics.data ?? [];
  const completed = topicRows.filter((topic) => topic.status === "Completed").length;
  const progress = topicRows.length ? Math.round((completed / topicRows.length) * 100) : 0;
  const rowFilter = (row: DbRow) => (selectedStatus === "All statuses" || String(row.status) === selectedStatus)
    && (selectedSubject === "All subjects" || String(row.subject_id) === selectedSubject);
  const transformValues = (values: Record<string, string | number | null>) => ({
    ...values,
    date_completed: values.status === "Completed" ? (values.date_completed || localISODate()) : null,
  });

  return <div className="space-y-6">
    <PageHeader eyebrow="Topic management" title="Topics" description="Break each subject into manageable learning milestones." />
    <Panel title="Topic completion progress" description={`${completed} of ${topicRows.length} topics completed`}>
      <div className="flex items-center gap-4 px-5 py-5"><div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><div className="font-mono text-sm font-medium text-indigo-700">{progress}%</div></div>
      <div className="flex flex-wrap gap-5 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{completed} completed</span><span className="inline-flex items-center gap-1.5"><Circle className="h-3.5 w-3.5" />{topicRows.length - completed} to work through</span><span className="ml-auto inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-indigo-500" />Based on saved topics</span></div>
    </Panel>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">Filter status</span>{["All statuses", "Not Started", "In Progress", "Completed"].map((status) => <button key={status} onClick={() => setSelectedStatus(status)} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${selectedStatus === status ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{status}</button>)}<label className="ml-auto flex items-center gap-2 text-xs text-slate-500"><span>Subject</span><select className="field-control min-w-44 py-2 text-xs" value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}><option value="All subjects">All subjects</option>{subjectOptions.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}</select></label></div>
    <CrudPage title="Topic records" description="All topics for your subjects." table="topics" fields={fields} columns={columns} searchKeys={["name", "description", "difficulty"]} rowFilter={rowFilter} emptyTitle="No topics yet" emptyMessage="Create the first topic and update its completion status as you study." addLabel="Add topic" hideHeader transformValues={transformValues} />
  </div>;
}
