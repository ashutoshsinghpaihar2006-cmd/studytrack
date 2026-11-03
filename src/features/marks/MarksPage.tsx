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
  const studentOptions = useMemo(() => (students.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.full_name)} · ${String(row.student_code)}` })), [students.data]);
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjects.data]);
  const examOptions = useMemo(() => (exams.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.name)} · ${String(row.exam_date)}` })), [exams.data]);
  const studentMap = useMemo(() => new Map((students.data ?? []).map((row) => [String(row.id), `${String(row.full_name)} · ${String(row.student_code)}`])), [students.data]);
  const subjectMap = useMemo(() => new Map((subjects.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjects.data]);
  const examMap = useMemo(() => new Map((exams.data ?? []).map((row) => [String(row.id), String(row.name)])), [exams.data]);
  const examById = useMemo(() => new Map((exams.data ?? []).map((row) => [String(row.id), row])), [exams.data]);
  const fields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
    { name: "exam_id", label: "Examination", kind: "select", required: true, options: examOptions, helper: "Choose an exam for the selected subject." },
    { name: "obtained_marks", label: "Obtained Marks", kind: "number", min: 0, step: 0.5, required: true },
  ];
  const columns: ColumnSpec[] = [
    { key: "student_id", label: "Student", render: (row) => String(studentMap.get(String(row.student_id)) ?? "Unavailable") },
    { key: "subject_id", label: "Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
    { key: "exam_id", label: "Examination", render: (row) => String(examMap.get(String(row.exam_id)) ?? "Unavailable") },
    { key: "obtained_marks", label: "Result", render: (row) => <span className="font-semibold text-ink">{String(row.obtained_marks)} / {String(row.maximum_marks)}</span> },
    { key: "percentage", label: "Percentage", render: (row) => `${percent(Number(row.obtained_marks ?? 0), Number(row.maximum_marks ?? 0))}%` },
  ];
  const examResults = marks.data ?? [];
  const assignments = useTableRows("assignments");
  const scoreTotal = examResults.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0) + (assignments.data ?? []).reduce((sum, row) => sum + Number(row.marks_obtained ?? 0), 0);
  const maxTotal = examResults.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0) + (assignments.data ?? []).filter((row) => row.marks_obtained != null).reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
  const overall = maxTotal ? percent(scoreTotal, maxTotal) : 0;
  const chartData = useMemo(() => (subjects.data ?? []).map((subject) => {
    const subjectMarks = examResults.filter((mark) => mark.subject_id === subject.id);
    const subjectAssignments = (assignments.data ?? []).filter((assignment) => assignment.subject_id === subject.id && assignment.marks_obtained != null);
    const obtained = subjectMarks.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0) + subjectAssignments.reduce((sum, row) => sum + Number(row.marks_obtained ?? 0), 0);
    const maximum = subjectMarks.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0) + subjectAssignments.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
    return { subject: String(subject.code), name: String(subject.name), percentage: maximum ? percent(obtained, maximum) : 0, count: subjectMarks.length + subjectAssignments.length };
  }).filter((item) => item.count > 0), [assignments.data, examResults, subjects.data]);
  const scoredAssignments = (assignments.data ?? []).filter((row) => row.marks_obtained != null).length;
  const transformValues = (values: FormValues) => {
    const exam = examById.get(String(values.exam_id ?? ""));
    if (!exam) throw new Error("Select an existing examination before recording marks.");
    if (exam.subject_id !== values.subject_id) throw new Error("The selected exam belongs to a different subject.");
    const maximum = Number(exam.maximum_marks);
    const obtained = Number(values.obtained_marks);
    if (obtained > maximum) throw new Error(`Obtained marks cannot exceed this exam's maximum of ${maximum}.`);
    return { ...values, maximum_marks: maximum };
  };
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Overall performance" value={maxTotal ? `${overall}%` : "—"} detail="Weighted across recorded exam and assignment marks" icon={<Target className="h-4 w-4" />} tone="indigo" /><MetricCard label="Exam results" value={examResults.length} detail="Student examination marks recorded" icon={<Award className="h-4 w-4" />} tone="blue" /><MetricCard label="Assignment scores" value={scoredAssignments} detail="Assignments with marks entered" icon={<Activity className="h-4 w-4" />} tone="green" /></div>
    <Panel title="Subject-wise performance" description="Percentages use actual marks from examinations and scored assignments.">
      {chartData.length ? <div className="h-[280px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 10, left: -18, bottom: 8 }}><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, "Performance"]} labelFormatter={(label) => chartData.find((item) => item.subject === label)?.name ?? label} /><Bar dataKey="percentage" fill="#4f46e5" radius={[7, 7, 0, 0]} maxBarSize={52} /></BarChart></ResponsiveContainer></div> : <div className="px-5"><div className="py-12 text-center text-xs text-slate-400">Record exam or assignment marks to see subject comparisons.</div></div>}
    </Panel>
    <CrudPage title="Marks & Performance" eyebrow="Academic results" description="Record and edit examination marks for each student, subject, and exam." table="marks" fields={fields} columns={columns} searchKeys={[]} emptyTitle="No marks recorded" emptyMessage="Choose a student, subject, and exam to enter an academic result." addLabel="Record marks" transformValues={transformValues} />
    <Panel title="Scored assignments" description="Assignment marks are entered and edited in the Assignments module."><div className="divide-y divide-slate-100">{(assignments.data ?? []).filter((row) => row.marks_obtained != null).map((row) => <div key={String(row.id)} className="flex items-center justify-between px-5 py-3.5"><div><div className="text-sm font-medium text-ink">{String(row.title)}</div><div className="mt-0.5 text-[10px] text-slate-400">{String(subjectMap.get(String(row.subject_id)) ?? "Unavailable")} · {formatDate(row.assigned_date)}</div></div><div className="font-mono text-xs text-indigo-700">{String(row.marks_obtained)} / {String(row.maximum_marks)}</div></div>)}{!scoredAssignments && <div className="px-5 py-6 text-xs text-slate-400">No assignment marks recorded yet.</div>}</div></Panel>
  </div>;
}
