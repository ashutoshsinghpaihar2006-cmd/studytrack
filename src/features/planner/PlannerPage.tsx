import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers";
import { useTableRows } from "../../components/CrudPage";
import { RecordDialog, type FormValues } from "../../components/RecordDialog";
import {
  Button,
  InlineError,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
  SuccessNote,
} from "../../components/ui";
import type { ColumnSpec, DbRow, FieldSpec } from "../../lib/database.types";
import {
  durationBetween,
  formatDate,
  formatDuration,
  formatTime,
  localISODate,
} from "../../lib/format";

export function PlannerPage() {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const sessionsQuery = useTableRows("study_sessions");
  const studentsQuery = useTableRows("students");
  const subjectsQuery = useTableRows("subjects");
  const topicsQuery = useTableRows("topics");
  const enrollmentsQuery = useTableRows("student_subjects");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DbRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rows = sessionsQuery.data ?? [];
  const subjectMap = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((row) => [String(row.id), String(row.name)])),
    [subjectsQuery.data]
  );
  const topicMap = useMemo(
    () => new Map((topicsQuery.data ?? []).map((row) => [String(row.id), String(row.name)])),
    [topicsQuery.data]
  );
  const studentMap = useMemo(
    () => new Map((studentsQuery.data ?? []).map((row) => [String(row.id), String(row.full_name)])),
    [studentsQuery.data]
  );

  const studentOptions = useMemo(
    () =>
      (studentsQuery.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.full_name)} · ${String(row.student_code)}`,
      })),
    [studentsQuery.data]
  );
  const subjectOptions = useMemo(
    () =>
      (subjectsQuery.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} · ${String(row.name)}`,
      })),
    [subjectsQuery.data]
  );
  const topicOptions = useMemo(
    () =>
      (topicsQuery.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.name)} · ${String(subjectMap.get(String(row.subject_id)) ?? "Subject")}`,
      })),
    [subjectMap, topicsQuery.data]
  );

  const fields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    {
      name: "topic_id",
      label: "Topic",
      kind: "select",
      options: topicOptions,
      helper: "Optional; select from topics belonging to this course.",
    },
    { name: "study_date", label: "Study Date", kind: "date", required: true },
    { name: "start_time", label: "Start Time", kind: "time", required: true },
    { name: "end_time", label: "End Time", kind: "time", required: true },
    {
      name: "status",
      label: "Status",
      kind: "select",
      required: true,
      options: ["Planned", "Completed", "Missed"].map((value) => ({ value, label: value })),
    },
    { name: "notes", label: "Notes", kind: "textarea" },
  ];

  const start =
    view === "month"
      ? startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 })
      : view === "week"
      ? startOfWeek(selectedDate, { weekStartsOn: 1 })
      : selectedDate;
  const end =
    view === "month"
      ? endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
      : view === "week"
      ? endOfWeek(selectedDate, { weekStartsOn: 1 })
      : selectedDate;

  const visibleDays = useMemo(
    () => (view === "day" ? [selectedDate] : eachDayOfInterval({ start, end })),
    [end, selectedDate, start, view]
  );

  const visibleSessions = useMemo(
    () =>
      rows
        .filter((row) => {
          const date = String(row.study_date ?? "");
          return date >= format(start, "yyyy-MM-dd") && date <= format(end, "yyyy-MM-dd");
        })
        .sort((a, b) => `${a.study_date}-${a.start_time}`.localeCompare(`${b.study_date}-${b.start_time}`)),
    [end, rows, start]
  );

  const completed = rows.filter((row) => row.status === "Completed");
  const totalMinutes = completed.reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0);
  const plannedCount = rows.filter((row) => row.status === "Planned").length;
  const completeCount = completed.length;

  const loading =
    sessionsQuery.isLoading ||
    studentsQuery.isLoading ||
    subjectsQuery.isLoading ||
    topicsQuery.isLoading ||
    enrollmentsQuery.isLoading;
  const loadError = [sessionsQuery, studentsQuery, subjectsQuery, topicsQuery, enrollmentsQuery].find(
    (query) => query.isError
  );
  const assigned = enrollmentsQuery.data ?? [];

  async function save(values: FormValues) {
    if (!client || !user) throw new Error("Sign in before planning study sessions.");
    const studentId = String(values.student_id ?? "");
    const subjectId = String(values.subject_id ?? "");
    const topicId = values.topic_id ? String(values.topic_id) : null;

    if (!assigned.some((entry) => entry.student_id === studentId && entry.subject_id === subjectId))
      throw new Error("Assign this subject to the selected student before planning a session.");
    if (
      topicId &&
      !(topicsQuery.data ?? []).some((topic) => topic.id === topicId && topic.subject_id === subjectId)
    )
      throw new Error("Choose a topic that belongs to the selected subject.");

    const duration = durationBetween(String(values.start_time ?? ""), String(values.end_time ?? ""));
    if (duration <= 0) throw new Error("End time must be later than start time.");

    const payload = {
      ...values,
      topic_id: topicId,
      duration_minutes: duration,
      owner_id: user.id,
    };

    setBusy(true);
    setError("");
    const result = editing
      ? await client.from("study_sessions").update(payload).eq("id", editing.id)
      : await client.from("study_sessions").insert(payload);
    setBusy(false);

    if (result.error) throw result.error;
    await queryClient.invalidateQueries();
    setDialogOpen(false);
    setEditing(null);
    setSuccess(editing ? "Study session updated." : "Study session scheduled.");
    window.setTimeout(() => setSuccess(""), 3500);
  }

  async function remove(row: DbRow) {
    if (!client || !window.confirm("Delete this study session?")) return;
    const { error: deleteError } = await client.from("study_sessions").delete().eq("id", row.id);
    if (deleteError) setError(deleteError.message);
    else {
      await queryClient.invalidateQueries();
      setSuccess("Study session deleted.");
      window.setTimeout(() => setSuccess(""), 3500);
    }
  }

  function shiftDate(direction: number) {
    if (view === "month")
      setSelectedDate((current) => (direction > 0 ? addMonths(current, 1) : subMonths(current, 1)));
    else setSelectedDate((current) => addDays(current, direction * (view === "week" ? 7 : 1)));
  }

  function openNew(date = selectedDate) {
    setEditing(null);
    setSelectedDate(date);
    setError("");
    setDialogOpen(true);
  }

  const columns: ColumnSpec[] = [
    { key: "study_date", label: "Study date", render: (row) => formatDate(row.study_date) },
  ];
  void columns;

  if (loading)
    return (
      <div className="space-y-5">
        <PageHeader
          title="Study Planner"
          description="Organize manual focus sessions and track completed hours."
        />
        <div className="surface p-6 text-center text-sm text-slate-500">
          Loading calendar records…
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time Management"
        title="Study Planner"
        description="Schedule focused study blocks, review course topics, and maintain steady weekly momentum."
        action={
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 -ml-0.5" />
            Plan a Session
          </Button>
        }
      />

      {loadError && (
        <InlineError
          message={
            loadError.error instanceof Error
              ? loadError.error.message
              : "Some planner records could not be loaded."
          }
          onRetry={() => {
            void Promise.all([
              sessionsQuery.refetch(),
              studentsQuery.refetch(),
              subjectsQuery.refetch(),
              topicsQuery.refetch(),
              enrollmentsQuery.refetch(),
            ]);
          }}
        />
      )}
      {error && <InlineError message={error} />}
      {success && <SuccessNote message={success} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Completed Sessions"
          value={completeCount}
          detail="Finished focus blocks"
          icon={<CalendarDays className="h-4 w-4" />}
          tone="green"
        />
        <MetricCard
          label="Total Study Time"
          value={formatDuration(totalMinutes)}
          detail="From completed sessions"
          icon={<Clock3 className="h-4 w-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Planned Sessions"
          value={plannedCount}
          detail="Upcoming on your schedule"
          icon={<CalendarDays className="h-4 w-4" />}
          tone="blue"
        />
      </div>

      <Panel className="overflow-hidden">
        {/* Calendar Navigation Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-subtle">
              <button
                aria-label="Previous period"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                onClick={() => shiftDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next period"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                onClick={() => shiftDate(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-ink">
                {format(selectedDate, view === "day" ? "EEEE, MMMM d, yyyy" : "MMMM yyyy")}
              </div>
              <button
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                onClick={() => setSelectedDate(new Date())}
              >
                Jump to Today
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-900/5">
            {(["day", "week", "month"] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => setView(choice)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-[background-color,color,box-shadow] duration-150 ${
                  view === choice
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar View Body */}
        {view === "month" ? (
          <div className="p-3 md:p-5">
            <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {visibleDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayRows = rows.filter((row) => String(row.study_date) === key);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedDate(day);
                      setView("day");
                    }}
                    className={`min-h-[96px] border-b border-r border-slate-100 p-2 text-left transition-colors md:min-h-[118px] hover:bg-indigo-50/40 ${
                      !isCurrentMonth ? "bg-slate-50/50 text-slate-300" : "text-slate-600"
                    } ${isToday ? "bg-indigo-50/60" : ""}`}
                  >
                    <span
                      className={`inline-grid h-6 w-6 place-items-center rounded-full font-mono text-xs tabular-nums ${
                        isSelected
                          ? "bg-indigo-600 text-white font-bold"
                          : isToday
                          ? "font-bold text-indigo-700"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1.5 space-y-1">
                      {dayRows.slice(0, 2).map((row) => (
                        <div
                          key={String(row.id)}
                          className={`truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium tracking-tight ${
                            row.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/10"
                              : row.status === "Missed"
                              ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/10"
                              : "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/10"
                          }`}
                        >
                          {String(subjectMap.get(String(row.subject_id)) ?? "Study")}
                        </div>
                      ))}
                      {dayRows.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          +{dayRows.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : view === "week" ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
            {visibleDays.map((day) => {
              const dayRows = rows.filter(
                (row) => String(row.study_date) === format(day, "yyyy-MM-dd")
              );
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[190px] rounded-2xl border p-3.5 text-left transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-400/20 shadow-sm"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={`mt-1 text-xl font-bold tracking-tight tabular-nums ${
                          isToday ? "text-indigo-600" : "text-ink"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 tabular-nums">
                      {dayRows.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {dayRows.slice(0, 3).map((row) => (
                      <div
                        key={String(row.id)}
                        className="rounded-lg bg-slate-50/90 p-2 ring-1 ring-slate-900/5"
                      >
                        <div className="truncate text-[11px] font-semibold text-slate-800">
                          {String(subjectMap.get(String(row.subject_id)) ?? "Study")}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-500 tabular-nums font-mono">
                          {String(row.start_time).slice(0, 5)} ·{" "}
                          {formatDuration(Number(row.duration_minutes ?? 0))}
                        </div>
                      </div>
                    ))}
                    {dayRows.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        +{dayRows.length - 3} sessions
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleSessions.length ? (
              visibleSessions.map((row) => (
                <SessionRow
                  key={String(row.id)}
                  row={row}
                  subject={subjectMap.get(String(row.subject_id)) ?? "Subject"}
                  topic={topicMap.get(String(row.topic_id))}
                  student={studentMap.get(String(row.student_id)) ?? "Student"}
                  onEdit={() => {
                    setEditing(row);
                    setError("");
                    setDialogOpen(true);
                  }}
                  onDelete={() => void remove(row)}
                />
              ))
            ) : (
              <div className="px-5 py-14 text-center text-xs text-slate-400">
                No sessions planned for this date. Click &quot;Plan a Session&quot; to add one.
              </div>
            )}
          </div>
        )}

        {/* Footer Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span className="tabular-nums">
            Showing {visibleSessions.length} session
            {visibleSessions.length === 1 ? "" : "s"} in this view
          </span>
          <span className="tabular-nums">
            {completeCount} completed · {plannedCount} planned ·{" "}
            {formatDuration(totalMinutes)} total focus time
          </span>
        </div>
      </Panel>

      {/* Selected Day Agenda */}
      {view !== "day" && (
        <Panel
          title={`Agenda for ${format(selectedDate, "EEEE, MMMM d")}`}
          description="Detailed breakdown of scheduled study sessions for this date."
        >
          {rows.filter((row) => String(row.study_date) === format(selectedDate, "yyyy-MM-dd"))
            .length ? (
            <div className="divide-y divide-slate-100">
              {rows
                .filter((row) => String(row.study_date) === format(selectedDate, "yyyy-MM-dd"))
                .map((row) => (
                  <SessionRow
                    key={String(row.id)}
                    row={row}
                    subject={subjectMap.get(String(row.subject_id)) ?? "Subject"}
                    topic={topicMap.get(String(row.topic_id))}
                    student={studentMap.get(String(row.student_id)) ?? "Student"}
                    onEdit={() => {
                      setEditing(row);
                      setError("");
                      setDialogOpen(true);
                    }}
                    onDelete={() => void remove(row)}
                  />
                ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              No sessions scheduled for this day.
            </div>
          )}
        </Panel>
      )}

      <RecordDialog
        open={dialogOpen}
        title={editing ? "Edit Study Session" : "Plan a Study Session"}
        description="Choose your course, topic, timing, and initial completion status."
        fields={fields}
        initialValues={
          editing
            ? Object.fromEntries(
                fields.map((field) => [
                  field.name,
                  (editing[field.name] as string | number | null) ?? "",
                ])
              )
            : { study_date: localISODate(selectedDate), status: "Planned" }
        }
        busy={busy}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />
    </div>
  );
}

function SessionRow({
  row,
  subject,
  topic,
  student,
  onEdit,
  onDelete,
}: {
  row: DbRow;
  subject: string;
  topic?: string;
  student: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/15">
        <Clock3 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">
          {subject}
          {topic ? (
            <span className="font-normal text-slate-500"> · {topic}</span>
          ) : (
            ""
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
          <span className="font-medium text-slate-600">{student}</span> ·{" "}
          <span className="font-mono">{formatTime(row.start_time)}–{formatTime(row.end_time)}</span> (
          {formatDuration(Number(row.duration_minutes ?? 0))}) · {formatDate(row.study_date)}
        </div>
        {row.notes != null && String(row.notes) !== "" && (
          <div className="mt-1 text-xs text-slate-500 italic bg-slate-50/80 p-2 rounded-lg">
            {String(row.notes)}
          </div>
        )}
      </div>
      <StatusBadge value={String(row.status)} />
      <div className="flex items-center gap-1">
        <button
          aria-label="Edit session"
          title="Edit"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 active:scale-95 transition-all"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Delete session"
          title="Delete"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
