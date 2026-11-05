import { useMemo } from "react";
import { BookOpenCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, useTableRows } from "../../components/CrudPage";
import { Panel } from "../../components/ui";
import { useAuth } from "../../app/providers";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";

export function SubjectsPage() {
  const { client, role } = useAuth();
  const studentsQuery = useTableRows("students");
  const subjectsQuery = useTableRows("subjects");

  const { data: professors = [] } = useQuery({
    queryKey: ["professors_list"],
    enabled: Boolean(client),
    queryFn: async () => {
      if (!client) return [];
      try {
        const { data } = await client
          .from("profiles")
          .select("id, full_name")
          .eq("role", "professor");
        return (data ?? []) as Array<{ id: string; full_name: string }>;
      } catch {
        return [];
      }
    },
  });

  const professorOptions = useMemo(
    () => professors.map((p) => ({ value: p.id, label: p.full_name })),
    [professors]
  );
  const professorMap = useMemo(
    () => new Map(professors.map((p) => [p.id, p.full_name])),
    [professors]
  );

  const subjectFields: FieldSpec[] = useMemo(() => [
    { name: "name", label: "Subject Name", required: true },
    { name: "code", label: "Subject Code", required: true, placeholder: "e.g. CS301" },
    { name: "credits", label: "Credits", kind: "number", min: 0, max: 30, required: true },
    { name: "semester", label: "Semester", kind: "number", min: 1, max: 12, required: true },
    {
      name: "professor_id",
      label: "Assigned Professor",
      kind: "select",
      options: professorOptions,
      helper: "Institutional faculty member responsible for this course.",
    },
    { name: "faculty", label: "Department / Faculty Text", placeholder: "e.g. Computer Science Dept" },
    { name: "description", label: "Description", kind: "textarea" },
  ], [professorOptions]);

  const subjectColumns: ColumnSpec[] = useMemo(() => [
    {
      key: "code",
      label: "Subject ID",
      render: (row) => <span className="font-mono text-xs text-indigo-700 font-bold">{String(row.code)}</span>,
    },
    {
      key: "name",
      label: "Subject",
      render: (row) => {
        const profName = row.professor_id ? professorMap.get(String(row.professor_id)) : null;
        return (
          <div>
            <div className="font-semibold text-ink">{String(row.name)}</div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              {profName ? `Prof. ${profName}` : String(row.faculty ?? "Faculty not assigned")}
            </div>
          </div>
        );
      },
    },
    { key: "credits", label: "Credits" },
    { key: "semester", label: "Semester", render: (row) => `Sem ${String(row.semester)}` },
  ], [professorMap]);

  const studentOptions = useMemo(
    () =>
      (studentsQuery.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.full_name)} • ${String(row.student_code)}`,
      })),
    [studentsQuery.data]
  );
  const subjectOptions = useMemo(
    () =>
      (subjectsQuery.data ?? []).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} • ${String(row.name)}`,
      })),
    [subjectsQuery.data]
  );

  const studentMap = useMemo(
    () => new Map((studentsQuery.data ?? []).map((row) => [String(row.id), `${String(row.full_name)} • ${String(row.student_code)}`])),
    [studentsQuery.data]
  );
  const subjectMap = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((row) => [String(row.id), `${String(row.code)} • ${String(row.name)}`])),
    [subjectsQuery.data]
  );

  const assignmentFields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    { name: "subject_id", label: "Subject", kind: "select", required: true, options: subjectOptions },
  ];
  const assignmentColumns: ColumnSpec[] = [
    { key: "student_id", label: "Student", render: (row) => String(studentMap.get(String(row.student_id)) ?? "Unavailable") },
    { key: "subject_id", label: "Assigned Subject", render: (row) => String(subjectMap.get(String(row.subject_id)) ?? "Unavailable") },
  ];

  return (
    <div className="space-y-7">
      <CrudPage
        title="Subjects & Courses"
        eyebrow="Academic catalogue"
        description={
          role === "student"
            ? "Your semester coursework modules and syllabus."
            : "Maintain your course list, assign professors, and review course credits."
        }
        table="subjects"
        fields={subjectFields}
        columns={subjectColumns}
        searchKeys={["name", "code", "faculty"]}
        emptyTitle="No subjects configured"
        emptyMessage="Add coursework subjects to link syllabus topics, assignments, exams, and attendance."
        addLabel="Add Subject"
        readOnly={role === "student"}
      />

      {(role === "admin" || role === "professor") && (
        <Panel
          title="Student Course Enrollments"
          description="Enroll students into subjects so they receive attendance and assessment records."
        >
          {!studentOptions.length || !subjectOptions.length ? (
            <div className="px-5 py-6 text-sm text-slate-400">
              Add at least one student and one subject before enrolling students.
            </div>
          ) : (
            <div className="px-5 py-5">
              <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                <BookOpenCheck className="h-4 w-4 text-indigo-500" />
                Course enrollments enforce foreign-key relationships for attendance and examination marks.
              </div>
              <CrudPage
                title="Enrollments"
                description="Student-to-subject enrollments."
                table="student_subjects"
                fields={assignmentFields}
                columns={assignmentColumns}
                searchKeys={[]}
                emptyTitle="No student enrollments"
                emptyMessage="Enroll students into courses to make them available for attendance logging."
                addLabel="Enroll Student"
                readOnly={false}
              />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
