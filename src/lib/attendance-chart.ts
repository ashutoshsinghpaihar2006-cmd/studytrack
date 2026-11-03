import { format, parseISO, subDays } from "date-fns";
import type { DbRow } from "./database.types";
import { percent } from "./format";

export type AttendanceChartPoint = { date: string; label: string; attendance: number; classes: number };

export function buildAttendanceChart(rows: DbRow[], days = 7): AttendanceChartPoint[] {
  const now = new Date();
  const points: AttendanceChartPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = format(subDays(now, offset), "yyyy-MM-dd");
    const entries = rows.filter((row) => String(row.attendance_date) === date);
    const attended = entries.filter((row) => row.status === "Present" || row.status === "Late").length;
    points.push({ date, label: format(parseISO(date), "EEE"), attendance: percent(attended, entries.length), classes: entries.length });
  }
  return points;
}
