import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, GraduationCap, RefreshCw } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { Button, MetricCard, PageHeader, StatusBadge } from "../../components/ui";
import { assignmentStatus, formatDate, localISODate } from "../../lib/format";
import type { ColumnSpec, DbRow, FieldSpec } from "../../lib/database.types";
import { GoogleClassroomModal } from "./GoogleClassroomModal";
import { getStoredClassroomState } from "../../lib/google-classroom";
import { useAuth } from "../../app/providers";
import { useQueryClient } from "@tanstack/react-query";

export function AssignmentsPage() {
  const { client, user, role } = useAuth();
  const queryClient = useQueryClient();

  const subjects = useTableRows("subjects");
  const assignments = useTableRows("assignments");
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const classroomState = getStoredClassroomState();

  async function toggleStatus(row: DbRow) {
    if (!client || !user) return;
    const currentDerived = assignmentStatus(row.status, row.submission_deadline);
    const nextStatus = currentDerived === "Submitted" ? "Pending" : "Submitted";

    setUpdatingId(String(row.id));
    try {
      const { error } = await client
        .from("assignments")
        .update({ status: nextStatus })
        .eq("id", row.id);
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: ["table", user.id, "assignments"] });
      }
    } finally {
      setUpdatingId(null);
    }
  }

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

  const fields: FieldSpec[] = [
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "title", label: "Assignment Title", required: true },
    { name: "description", label: "Description", kind: "textarea" },
    { name: "assigned_date", label: "Assigned Date", kind: "date", required: true },
    { name: "submission_deadline", label: "Submission Deadline", kind: "date", required: true },
    {
      name: "status",
      label: "Status",
      kind: "select",
      required: true,
      options: ["Pending", "Submitted", "Overdue"].map((value) => ({ value, label: value })),
    },
    { name: "marks_obtained", label: "Marks Obtained", kind: "number", min: 0, step: 0.5 },
    {
      name: "maximum_marks",
      label: "Maximum Marks",
      kind: "number",
      min: 0.01,
      step: 0.5,
      required: true,
      helper: "Sets the maximum possible score for performance calculations.",
    },
  ];

  const columns: ColumnSpec[] = [
    {
      key: "title",
      label: "Assignment",
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{String(row.title)}</div>
          <div className="mt-0.5 max-w-xs truncate text-[11px] text-slate-400">
            {String(row.description ?? "")}
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
      key: "assigned_date",
      label: "Assigned",
      render: (row) => (
        <span className="tabular-nums text-slate-500">
          {formatDate(row.assigned_date)}
        </span>
      ),
    },
    {
      key: "submission_deadline",
      label: "Deadline",
      render: (row) => (
        <span className="tabular-nums font-medium text-slate-700">
          {formatDate(row.submission_deadline)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status (Click to toggle)",
      render: (row) => {
        const derived = assignmentStatus(row.status, row.submission_deadline);
        const isBusy = updatingId === String(row.id);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(row);
            }}
            disabled={isBusy}
            title={derived === "Submitted" ? "Click to mark as Pending" : "Click to mark as Submitted"}
            className="group inline-flex items-center gap-1.5 rounded-md p-1 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <StatusBadge value={derived} />
            <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-700 transition">
              {isBusy ? "Saving..." : derived === "Submitted" ? "↺ Pending" : "✓ Done"}
            </span>
          </button>
        );
      },
    },
    {
      key: "marks_obtained",
      label: "Score",
      render: (row) =>
        row.marks_obtained == null ? (
          <span className="text-slate-300">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-indigo-700 tabular-nums">
            {String(row.marks_obtained)} / {String(row.maximum_marks)}
          </span>
        ),
    },
  ];

  const rows = assignments.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter(
    (row) => assignmentStatus(row.status, row.submission_deadline) !== "Submitted"
  );
  const overdue = rows.filter(
    (row) => assignmentStatus(row.status, row.submission_deadline) === "Overdue"
  );
  const upcoming = pending.filter((row) => String(row.submission_deadline ?? "") >= today).length;

  const subjectList = useMemo(
    () =>
      (subjects.data ?? []).map((s) => ({
        id: String(s.id),
        name: String(s.name),
        code: String(s.code),
      })),
    [subjects.data]
  );

  const existingAssignmentList = useMemo(
    () =>
      rows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        subject_id: String(r.subject_id),
      })),
    [rows]
  );

  return (
    <div className="space-y-6">
      {/* Header with Google Classroom Sync Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Academic Coursework</div>
          <h1 className="page-title">Assignments &amp; Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track submission deadlines, grades, and synchronize directly with Google Classroom.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            className="border-emerald-200/80 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60 ring-1 ring-emerald-500/15"
            onClick={() => setClassroomOpen(true)}
          >
            <GraduationCap className="h-4 w-4 text-emerald-600 -ml-0.5" />
            <span>
              {classroomState.isConnected ? "Classroom Synced" : "Google Classroom"}
            </span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Pending Coursework"
          value={pending.length}
          detail="Assignments awaiting completion"
          icon={<ClipboardList className="h-4 w-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Overdue Assignments"
          value={overdue.length}
          detail="Past deadline and unsubmitted"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={overdue.length ? "amber" : "green"}
        />
        <MetricCard
          label="Upcoming Deadlines"
          value={upcoming}
          detail="Due today or later this week"
          icon={<Clock3 className="h-4 w-4" />}
          tone="blue"
        />
      </div>

      <CrudPage
        title="Assignments"
        hideHeader
        eyebrow="Coursework"
        description="Track each assignment from assigned date through submission and marks."
        table="assignments"
        fields={fields}
        columns={columns}
        searchKeys={["title", "description", "status"]}
        emptyTitle="No assignments logged"
        emptyMessage="Add coursework deadlines manually or sync directly from Google Classroom."
        addLabel="Add assignment"
        readOnly={role === "student"}
        defaults={{
          assigned_date: localISODate(),
          submission_deadline: localISODate(),
          status: "Pending",
          maximum_marks: 100,
        }}
        transformValues={(values) => ({
          ...values,
          status:
            values.status === "Submitted"
              ? "Submitted"
              : String(values.submission_deadline ?? "") < localISODate()
              ? "Overdue"
              : "Pending",
        })}
      />

      <GoogleClassroomModal
        open={classroomOpen}
        onClose={() => setClassroomOpen(false)}
        subjects={subjectList}
        existingAssignments={existingAssignmentList}
      />
    </div>
  );
}
