import { useMemo } from "react";
import { BookOpenCheck } from "lucide-react";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { Panel } from "../../components/ui";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

const subjectFields: FieldSpec[] = [
  { name: "name", label: "Subject Name", required: true },
  { name: "code", label: "Subject Code", required: true, placeholder: "e.g. CS301" },
  { name: "credits", label: "Credits", kind: "number", min: 0, max: 30, required: true },
  { name: "semester", label: "Semester", kind: "number", min: 1, max: 12, required: true },
  { name: "faculty", label: "Assigned Faculty", placeholder: "Faculty name" },
  { name: "description", label: "Description", kind: "textarea" },
];
const subjectColumns: ColumnSpec[] = [
  { key: "code", label: "Subject ID", render: (row) => <span className="font-mono text-xs text-indigo-700">{String(row.code)}</span> },
  { key: "name", label: "Subject", render: (row) => <div><div className="font-semibold text-ink">{String(row.name)}</div><div className="mt-0.5 text-[10px] text-slate-400">{String(row.faculty ?? "Faculty not assigned")}</div></div> },
  { key: "credits", label: "Credits" },
  { key: "semester", label: "Semester", render: (row) => `Sem ${String(row.semester)}` },
];

export function SubjectsPage() {
  const studentsQuery = useTableRows("students");
  const subjectsQuery = useTableRows("subjects");
  const studentOptions = useMemo(() => (studentsQuery.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.full_name)} · ${String(row.student_code)}` })), [studentsQuery.data]);
  const subjectOptions = useMemo(() => (subjectsQuery.data ?? []).map((row) => ({ value: String(row.id), label: `${String(row.code)} · ${String(row.name)}` })), [subjectsQuery.data]);
  const assignmentFields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
  ];
  const studentMap = useMemo(() => new Map((studentsQuery.data ?? []).map((row) => [String(row.id), `${String(row.full_name)} · ${String(row.student_code)}`])), [studentsQuery.data]);
  const subjectMap = useMemo(() => new Map((subjectsQuery.data ?? []).map((row) => [String(row.id), `${String(row.code)} · ${String(row.name)}`])), [subjectsQuery.data]);
  const assignmentColumns: ColumnSpec[] = [
    { key: "student_id", label: "Student", render: (row) => String(studentMap.get(String(row.student_id)) ?? "Unavailable") },
    { key: "subject_id", label: "Assigned subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
  ];
  return <div className="space-y-7">
    <CrudPage title="Subjects" eyebrow="Academic catalogue" description="Maintain your subject list and compare performance by course." table="subjects" fields={subjectFields} columns={subjectColumns} searchKeys={["name", "code", "faculty"]} emptyTitle="No subjects yet" emptyMessage="Add the subjects you are taking to connect topics, assignments, and results." addLabel="Add subject" />
    <Panel title="Student subject assignments" description="Assign a subject to a student profile so attendance can be recorded.">
      {!studentOptions.length || !subjectOptions.length ? <div className="px-5 py-6 text-sm text-slate-400">Add at least one student and one subject before creating an assignment.</div> : <div className="px-5 py-5"><div className="mb-4 flex items-center gap-2 text-xs text-slate-500"><BookOpenCheck className="h-4 w-4 text-indigo-500" />Assignments are linked in Supabase and can be managed below.</div><CrudPage title="Assignments" description="Student-to-subject relationships." table="student_subjects" fields={assignmentFields} columns={assignmentColumns} searchKeys={[]} emptyTitle="No subject assignments" emptyMessage="Assign subjects to student profiles to make them available for attendance and study sessions." addLabel="Assign subject" /></div>}
    </Panel>
  </div>;
}
