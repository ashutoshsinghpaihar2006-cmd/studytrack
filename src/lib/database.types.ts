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
  "profiles",
  "announcements",
  "activity_logs",
  "timetable_slots",
] as const;

export type TableName = (typeof tableNames)[number];

export type UserRole = "admin" | "professor" | "student";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  approved: boolean;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  target_role: "all" | "student" | "professor";
  subject_id?: string | null;
  priority: "low" | "normal" | "urgent";
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  created_at: string;
};

export type DbRow = Record<string, unknown> & {
  id: string;
  owner_id?: string;
  created_at: string;
  updated_at?: string;
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

/**
 * Downloads data as a standard CSV file in the browser
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const escapeCell = (val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.replace(/\.csv$/, "")}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
