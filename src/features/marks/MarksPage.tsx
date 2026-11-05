import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Award, Target } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { MetricCard, Panel } from "../../components/ui";
import { formatDate, percent } from "../../lib/format";
import type { FormValues } from "../../components/RecordDialog";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

export function MarksPage() {
  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const exams = useTableRows("exams");
  const marks = useTableRows("marks");
  const assignments = useTableRows("assignments");

  const studentOptions = useMemo(
    () =>
      (students.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.full_name)} · ${String(row.student_code)}`,
      })),
    [students.data]
  );
  const subjectOptions = useMemo(
    () =>
      (subjects.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} · ${String(row.name)}`,
      })),
    [subjects.data]
  );
  const examOptions = useMemo(
    () =>
      (exams.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.name)} · ${String(row.exam_date)}`,
      })),
    [exams.data]
  );

  const studentMap = useMemo(
    () => new Map((students.data ?? []).map((row) => [String(row.id), `${String(row.full_name)} · ${String(row.student_code)}`])),
    [students.data]
  );
  const subjectMap = useMemo(
    () => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])),
    [subjects.data]
  );
  const examMap = useMemo(
    () => new Map((exams.data ?? []).map((row) => [String(row.id), String(row.name)])),
    [exams.data]
  );
  const examById = useMemo(
    () => new Map((exams.data ?? []).map((row) => [String(row.id), row])),
    [exams.data]
  );

  const fields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    {
      name: "exam_id",
      label: "Examination",
      kind: "select",
      required: true,
      options: examOptions,
      helper: "Select an exam defined for the chosen subject.",
    },
    { name: "obtained_marks", label: "Obtained Marks", kind: "number", min: 0, step: 0.5, required: true },
  ];

  const columns: ColumnSpec[] = [
    {
      key: "student_id",
      label: "Student",
      render: (row) => (
        <span className="font-semibold text-ink">
          {String(studentMap.get(String(row.student_id)) ?? "Unavailable")}
        </span>
      ),
    },
    {
      key: "subject_id",
      label: "Subject",
      render: (row) => (
        <span className="text-slate-600">
          {String(subjectMap.get(String(row.subject_id)) ?? "Unavailable")}
        </span>
      ),
    },
    {
      key: "exam_id",
      label: "Examination",
      render: (row) => (
        <span className="text-slate-700">
          {String(examMap.get(String(row.exam_id)) ?? "Unavailable")}
        </span>
      ),
    },
    {
      key: "obtained_marks",
      label: "Score",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-ink tabular-nums">
          {String(row.obtained_marks)} / {String(row.maximum_marks)}
        </span>
      ),
    },
    {
      key: "percentage",
      label: "Percentage",
      render: (row) => {
        const pct = percent(Number(row.obtained_marks ?? 0), Number(row.maximum_marks ?? 0));
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
              pct >= 75
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                : pct >= 50
                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
            }`}
          >
            {pct}%
          </span>
        );
      },
    },
  ];

  const examResults = marks.data ?? [];
  const scoreTotal =
    examResults.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0) +
    (assignments.data ?? []).reduce((sum, row) => sum + Number(row.marks_obtained ?? 0), 0);
  const maxTotal =
    examResults.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0) +
    (assignments.data ?? [])
      .filter((row) => row.marks_obtained != null)
      .reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
  const overall = maxTotal ? percent(scoreTotal, maxTotal) : 0;

  const chartData = useMemo(
    () =>
      (subjects.data ?? [])
        .map((subject) => {
          const subjectMarks = examResults.filter((mark) => mark.subject_id === subject.id);
          const subjectAssignments = (assignments.data ?? []).filter(
            (assignment) => assignment.subject_id === subject.id && assignment.marks_obtained != null
          );
          const obtained =
            subjectMarks.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0) +
            subjectAssignments.reduce((sum, row) => sum + Number(row.marks_obtained ?? 0), 0);
          const max =
            subjectMarks.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0) +
            subjectAssignments.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
          return {
            subject: String(subject.code),
            name: String(subject.name),
            percentage: max ? percent(obtained, max) : 0,
            count: subjectMarks.length + subjectAssignments.length,
          };
        })
        .filter((item) => item.count > 0),
    [assignments.data, examResults, subjects.data]
  );

  const scoredAssignments = (assignments.data ?? []).filter((row) => row.marks_obtained != null).length;

  const transformValues = (values: FormValues) => {
    const exam = examById.get(String(values.exam_id ?? ""));
    if (!exam) throw new Error("Select an existing examination before recording marks.");
    if (exam.subject_id !== values.subject_id)
      throw new Error("The selected exam belongs to a different course.");
    const maximum = Number(exam.maximum_marks);
    const obtained = Number(values.obtained_marks);
    if (obtained > maximum)
      throw new Error(`Obtained marks cannot exceed this exam's maximum of ${maximum}.`);
    return { ...values, maximum_marks: maximum };
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Overall Academic Average"
          value={maxTotal ? `${overall}%` : "—"}
          detail="Combined exams & scored coursework"
          icon={<Target className="h-4 w-4" />}
          tone="indigo"
        />
        <MetricCard
          label="Exam Results"
          value={examResults.length}
          detail="Individual exam grades logged"
          icon={<Award className="h-4 w-4" />}
          tone="blue"
        />
        <MetricCard
          label="Scored Assignments"
          value={scoredAssignments}
          detail="Assignments evaluated"
          icon={<Activity className="h-4 w-4" />}
          tone="green"
        />
      </div>

      <Panel
        title="Subject Performance Comparison"
        description="Aggregate marks computed from examination results and scored assignments."
      >
        {chartData.length ? (
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 8 }}>
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
                    chartData.find((item) => item.subject === label)?.name ?? label
                  }
                />
                <Bar dataKey="percentage" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-14 text-center text-xs text-slate-400">
            Record exam or assignment grades to view comparative performance bars.
          </div>
        )}
      </Panel>

      <CrudPage
        title="Marks & Performance"
        eyebrow="Examination Results"
        description="Record and update student examination grades by subject and test."
        table="marks"
        fields={fields}
        columns={columns}
        searchKeys={[]}
        emptyTitle="No marks recorded yet"
        emptyMessage="Select a student, course, and exam to log an evaluation mark."
        addLabel="Record marks"
        transformValues={transformValues}
      />

      <Panel
        title="Scored Coursework"
        description="Assignment marks are entered and managed through the Assignments module."
      >
        <div className="divide-y divide-slate-100">
          {(assignments.data ?? [])
            .filter((row) => row.marks_obtained != null)
            .map((row) => (
              <div
                key={String(row.id)}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{String(row.title)}</div>
                  <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                    {String(subjectMap.get(String(row.subject_id)) ?? "Unavailable")} ·{" "}
                    {formatDate(row.assigned_date)}
                  </div>
                </div>
                <div className="rounded-md bg-indigo-50/80 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-500/10 tabular-nums">
                  {String(row.marks_obtained)} / {String(row.maximum_marks)}
                </div>
              </div>
            ))}
          {!scoredAssignments && (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              No assignment scores evaluated yet.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
