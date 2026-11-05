import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Award, Download, Target } from "lucide-react";
import { useAuth } from "../../app/providers";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { Button, MetricCard, Panel } from "../../components/ui";
import { formatDate, percent } from "../../lib/format";
import { exportToCsv } from "../../lib/database.types";
import type { FormValues } from "../../components/RecordDialog";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

export function MarksPage() {
  const { role } = useAuth();
  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const exams = useTableRows("exams");
  const marks = useTableRows("marks");
  const assignments = useTableRows("assignments");

  const studentOptions = useMemo(
    () =>
      (students.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.full_name)} • ${String(row.student_code)}`,
      })),
    [students.data]
  );
  const subjectOptions = useMemo(
    () =>
      (subjects.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} • ${String(row.name)}`,
      })),
    [subjects.data]
  );
  const examOptions = useMemo(
    () =>
      (exams.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.name)} • ${String(row.exam_date)}`,
      })),
    [exams.data]
  );

  const studentMap = useMemo(
    () => new Map((students.data ?? []).map((row) => [String(row.id), `${String(row.full_name)} • ${String(row.student_code)}`])),
    [students.data]
  );
  const subjectMap = useMemo(
    () => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} • ${String(row.name)}`])),
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
    { name: "exam_id", label: "Examination", kind: "select", required: true, options: examOptions },
    {
      name: "maximum_marks",
      label: "Maximum Marks",
      kind: "number",
      required: true,
      min: 1,
      max: 1000,
      step: 0.5,
      helper: "Total possible marks for this exam sitting.",
    },
    {
      name: "obtained_marks",
      label: "Obtained Marks",
      kind: "number",
      required: true,
      min: 0,
      max: 1000,
      step: 0.5,
      helper: "Marks awarded to the student.",
    },
  ];

  const columns: ColumnSpec[] = [
    { key: "student_id", label: "Student", render: (row) => studentMap.get(String(row.student_id)) ?? "—" },
    { key: "subject_id", label: "Subject", render: (row) => subjectMap.get(String(row.subject_id)) ?? "—" },
    { key: "exam_id", label: "Examination", render: (row) => examMap.get(String(row.exam_id)) ?? "—" },
    {
      key: "score",
      label: "Score",
      render: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-ink">
          {Number(row.obtained_marks).toFixed(1)} / {Number(row.maximum_marks).toFixed(1)}
        </span>
      ),
    },
    {
      key: "percentage",
      label: "Percentage",
      render: (row) => {
        const pct =
          Number(row.maximum_marks) > 0
            ? (Number(row.obtained_marks) / Number(row.maximum_marks)) * 100
            : 0;
        return (
          <span
            className={`font-mono text-xs font-bold tabular-nums ${
              pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"
            }`}
          >
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    { key: "created_at", label: "Recorded", render: (row) => formatDate(String(row.created_at)) },
  ];

  const markRows = marks.data ?? [];
  const totalMarks = markRows.reduce((sum, r) => sum + Number(r.obtained_marks ?? 0), 0);
  const totalMax = markRows.reduce((sum, r) => sum + Number(r.maximum_marks ?? 0), 0);
  const overallAverage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;

  function handleExportCsv() {
    const headers = ["Student", "Subject", "Examination", "Obtained Marks", "Maximum Marks", "Percentage", "Date Recorded"];
    const rows = markRows.map((r) => {
      const pct = Number(r.maximum_marks) > 0 ? ((Number(r.obtained_marks) / Number(r.maximum_marks)) * 100).toFixed(1) + "%" : "0%";
      return [
        studentMap.get(String(r.student_id)) ?? String(r.student_id),
        subjectMap.get(String(r.subject_id)) ?? String(r.subject_id),
        examMap.get(String(r.exam_id)) ?? String(r.exam_id),
        Number(r.obtained_marks),
        Number(r.maximum_marks),
        pct,
        formatDate(String(r.created_at)),
      ];
    });
    exportToCsv("StudyTrack_Marks", headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Overall Examination Average"
          value={percent(totalMarks, totalMax || 1)}
          icon={<Award className="h-4 w-4" />}
          detail={`${markRows.length} examination results recorded`}
        />
        <MetricCard
          label="Evaluations Logged"
          value={markRows.length}
          icon={<Activity className="h-4 w-4" />}
          detail={`${exams.data?.length ?? 0} scheduled exams`}
        />
        <MetricCard
          label="Top Scoring Threshold"
          value="75%"
          icon={<Target className="h-4 w-4" />}
          detail="Distinction target benchmark"
        />
      </div>

      <CrudPage
        title="Marks & Performance"
        eyebrow="Academic evaluations"
        description={
          role === "student"
            ? "Your recorded scores and percentages across examinations."
            : "Record examination scores, compute percentages, and export academic performance."
        }
        table="marks"
        fields={fields}
        columns={columns}
        searchKeys={["student_id", "subject_id", "exam_id"]}
        searchPlaceholder="Filter marks by student, subject, or exam..."
        emptyTitle="No marks recorded yet"
        emptyMessage="Examination marks will show here once added."
        addLabel="Enter Marks"
        readOnly={role === "student"}
        extraAction={
          markRows.length > 0 ? (
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
