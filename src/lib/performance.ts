import type { DbRow } from "./database.types";
import { percent } from "./format";

export type SubjectPerformance = { subjectId: string; subject: string; name: string; percentage: number; obtained: number; maximum: number; assessments: number };

export function calculateSubjectPerformance(subjects: DbRow[], marks: DbRow[], assignments: DbRow[]): SubjectPerformance[] {
  return subjects.map((subject) => {
    const subjectMarks = marks.filter((row) => row.subject_id === subject.id);
    const subjectAssignments = assignments.filter((row) => row.subject_id === subject.id && row.marks_obtained != null);
    const obtained = subjectMarks.reduce((sum, row) => sum + Number(row.obtained_marks ?? 0), 0) + subjectAssignments.reduce((sum, row) => sum + Number(row.marks_obtained ?? 0), 0);
    const maximum = subjectMarks.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0) + subjectAssignments.reduce((sum, row) => sum + Number(row.maximum_marks ?? 0), 0);
    const assessments = subjectMarks.length + subjectAssignments.length;
    return { subjectId: String(subject.id), subject: String(subject.code), name: String(subject.name), percentage: maximum ? percent(obtained, maximum) : 0, obtained, maximum, assessments };
  }).filter((item) => item.assessments > 0);
}
