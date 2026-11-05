import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, ListChecks, Sparkles } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { PageHeader, Panel, StatusBadge } from "../../components/ui";
import type { ColumnSpec, DbRow, FieldSpec } from "../../lib/database.types";
import { localISODate } from "../../lib/format";
import { useAuth } from "../../app/providers";
import { useQueryClient } from "@tanstack/react-query";

export function TopicsPage() {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();

  const subjects = useTableRows("subjects");
  const topics = useTableRows("topics");

  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [selectedSubject, setSelectedSubject] = useState("All subjects");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const subjectOptions = useMemo(
    () =>
      (subjects.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} · ${String(row.name)}`,
      })),
    [subjects.data]
  );
  const subjectMap = useMemo(
    () =>
      new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])),
    [subjects.data]
  );

  async function cycleStatus(row: DbRow) {
    if (!client || !user) return;
    const currentStatus = String(row.status);
    let nextStatus = "In Progress";
    let dateCompleted: string | null = null;

    if (currentStatus === "Not Started") {
      nextStatus = "In Progress";
    } else if (currentStatus === "In Progress") {
      nextStatus = "Completed";
      dateCompleted = localISODate();
    } else {
      nextStatus = "Not Started";
      dateCompleted = null;
    }

    setUpdatingId(String(row.id));
    try {
      const { error } = await client
        .from("topics")
        .update({ status: nextStatus, date_completed: dateCompleted })
        .eq("id", row.id);
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: ["table", user.id, "topics"] });
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const fields: FieldSpec[] = [
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "name", label: "Topic Name", required: true },
    { name: "description", label: "Description", kind: "textarea" },
    {
      name: "status",
      label: "Completion Status",
      kind: "select",
      required: true,
      options: ["Not Started", "In Progress", "Completed"].map((value) => ({ value, label: value })),
    },
    {
      name: "difficulty",
      label: "Difficulty Level",
      kind: "select",
      required: true,
      options: ["Easy", "Medium", "Hard"].map((value) => ({ value, label: value })),
    },
    {
      name: "date_completed",
      label: "Date Completed",
      kind: "date",
      helper: "Set when completed; StudyTrack adds today's date if left blank.",
    },
  ];

  const columns: ColumnSpec[] = [
    {
      key: "name",
      label: "Topic",
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <button
            title={row.status === "Completed" ? "Mark incomplete" : "Mark completed"}
            onClick={() => void cycleStatus(row)}
            className="mt-0.5 rounded-full text-slate-300 hover:text-indigo-600 transition-colors"
          >
            {row.status === "Completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
            ) : row.status === "In Progress" ? (
              <Clock className="h-4 w-4 text-amber-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <div>
            <div
              className={`font-semibold text-ink ${
                row.status === "Completed" ? "line-through text-slate-400" : ""
              }`}
            >
              {String(row.name)}
            </div>
            <div className="mt-0.5 max-w-xs truncate text-[11px] text-slate-400">
              {String(row.description ?? "")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "subject_id",
      label: "Course",
      render: (row) => (
        <span className="text-slate-600">
          {String(subjectMap.get(String(row.subject_id)) ?? "Unavailable")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status (Interactive)",
      render: (row) => (
        <button
          title="Click to cycle status (Not Started → In Progress → Completed)"
          onClick={() => void cycleStatus(row)}
          disabled={updatingId === String(row.id)}
          className="group inline-flex items-center gap-1 rounded-full text-left active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <StatusBadge value={String(row.status ?? "—")} />
          <span className="opacity-0 group-hover:opacity-100 font-mono text-[9px] text-indigo-600 transition-opacity">
            ↻
          </span>
        </button>
      ),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (row) => (
        <span
          className={`font-medium text-xs ${
            row.difficulty === "Hard"
              ? "text-rose-600"
              : row.difficulty === "Medium"
              ? "text-amber-600"
              : "text-emerald-600"
          }`}
        >
          {String(row.difficulty)}
        </span>
      ),
    },
    {
      key: "date_completed",
      label: "Completed",
      render: (row) =>
        row.date_completed ? (
          <span className="tabular-nums font-mono text-xs text-slate-600">
            {String(row.date_completed)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  const topicRows = topics.data ?? [];
  const completed = topicRows.filter((topic) => topic.status === "Completed").length;
  const progress = topicRows.length ? Math.round((completed / topicRows.length) * 100) : 0;

  const rowFilter = (row: DbRow) =>
    (selectedStatus === "All statuses" || String(row.status) === selectedStatus) &&
    (selectedSubject === "All subjects" || String(row.subject_id) === selectedSubject);

  const transformValues = (values: Record<string, string | number | null>) => ({
    ...values,
    date_completed: values.status === "Completed" ? values.date_completed || localISODate() : null,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Milestones & Syllabus"
        title="Topics & Learning Units"
        description="Track conceptual milestones per course. Click any status chip to cycle completion state instantly."
      />

      <Panel
        title="Overall Syllabus Progress"
        description={`${completed} of ${topicRows.length} total topics completed`}
      >
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-900/5">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="font-mono text-base font-bold text-indigo-700 tabular-nums">
            {progress}%
          </div>
        </div>
        <div className="flex flex-wrap gap-5 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="tabular-nums">{completed} completed</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular-nums">{topicRows.length - completed} remaining</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
            <Sparkles className="h-3 w-3" />
            Click status pills to update without forms
          </span>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
        {["All statuses", "Not Started", "In Progress", "Completed"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${
              selectedStatus === status
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {status}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Filter Course:</span>
          <select
            className="field-control min-w-44 py-1.5 text-xs"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
          >
            <option value="All subjects">All subjects</option>
            {subjectOptions.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CrudPage
        title="Topic records"
        description="All topics for your subjects."
        table="topics"
        fields={fields}
        columns={columns}
        searchKeys={["name", "description", "difficulty"]}
        rowFilter={rowFilter}
        emptyTitle="No topics created yet"
        emptyMessage="Add the first topic to break down your course syllabus."
        addLabel="Add topic"
        hideHeader
        transformValues={transformValues}
      />
    </div>
  );
}
