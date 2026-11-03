export function formatDate(value: unknown, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  const date = new Date(String(value).includes("T") ? String(value) : `${String(value)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", options ?? { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatTime(value: unknown): string {
  if (!value) return "—";
  const [hourValue, minuteValue] = String(value).split(":").map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return String(value);
  const date = new Date();
  date.setHours(hourValue, minuteValue, 0, 0);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${remainder} min`;
}

export function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

export function assignmentStatus(status: unknown, deadline: unknown): string {
  const existing = String(status ?? "Pending");
  if (existing === "Submitted") return existing;
  if (deadline && new Date(`${String(deadline)}T23:59:59`).getTime() < Date.now()) return "Overdue";
  return existing === "Overdue" ? "Pending" : existing;
}

export function durationBetween(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Number.isFinite(duration) ? duration : 0;
}

export function localISODate(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
