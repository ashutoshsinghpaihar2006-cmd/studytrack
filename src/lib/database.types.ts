export const tableNames = [
  "students",
  "subjects",
  "student_subjects",
  "topics",
  "attendance",
  "assignments",
  "exams",
  "study_sessions",
  "marks",
] as const;

export type TableName = (typeof tableNames)[number];
export type DbRow = Record<string, unknown> & {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
export type Option = { value: string; label: string };
export type FieldKind = "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "select";
export type FieldSpec = {
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
};
export type ColumnSpec = {
  key: string;
  label: string;
  render?: (row: DbRow) => React.ReactNode;
};
