import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, ArrowUpRight, CheckCircle2, LoaderCircle, Plus, Search } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import type { ColumnSpec, DbRow } from "../lib/database.types";

export function cn(...values: ClassValue[]) { return twMerge(clsx(values)); }

export function Button({ children, variant = "primary", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; size?: "sm" | "md" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/15",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    quiet: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:pointer-events-none disabled:opacity-50", size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm", variants[variant], className)} {...props}>{children}</button>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>{eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}<h1 className="page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function Panel({ children, className = "", title, description, action }: PropsWithChildren<{ className?: string; title?: string; description?: string; action?: ReactNode }>) {
  return <section className={cn("surface", className)}>
    {(title || description || action) && <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6"><div>{title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}{description && <p className="mt-1 text-xs text-slate-400">{description}</p>}</div>{action}</div>}
    {children}
  </section>;
}

export function MetricCard({ label, value, detail, icon, tone = "indigo" }: { label: string; value: string | number; detail: string; icon: ReactNode; tone?: "indigo" | "blue" | "amber" | "green" }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600", blue: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" };
  return <div className="surface p-5 md:p-5"><div className="flex items-start justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}>{icon}</span></div><div className="mt-4 text-[27px] font-semibold tracking-[-0.05em] text-ink">{value}</div><div className="mt-1 text-[11px] text-slate-400">{detail}</div></div>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone = /completed|submitted|present|in progress/i.test(value) ? "bg-emerald-50 text-emerald-700" : /overdue|absent|missed|below/i.test(value) ? "bg-rose-50 text-rose-700" : /late|planned|not started|pending/i.test(value) ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize", tone)}>{value.replaceAll("_", " ")}</span>;
}

export function LoadingState({ label = "Loading your academic records…" }: { label?: string }) {
  return <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />{label}</div>;
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{message}</span>{onRetry && <button className="text-xs font-semibold underline" onClick={onRetry}>Retry</button>}</div>;
}

export function SuccessNote({ message }: { message: string }) {
  return <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><ArrowUpRight className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3><p className="mt-1 max-w-md text-xs leading-5 text-slate-400">{message}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function SearchBox({ value, onChange, placeholder = "Search records…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field-control pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

export function DataTable({ columns, rows, actions }: { columns: ColumnSpec[]; rows: DbRow[]; actions?: (row: DbRow) => ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse"><thead><tr className="table-head">{columns.map((column) => <th key={column.key} className="px-5 py-3 font-semibold">{column.label}</th>)}{actions && <th className="px-5 py-3 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={String(row.id)} className="group transition hover:bg-slate-50/70">{columns.map((column) => <td key={column.key} className="px-5 py-3.5 text-sm text-slate-600">{column.render ? column.render(row) : (row[column.key] == null || row[column.key] === "" ? <span className="text-slate-300">—</span> : String(row[column.key]))}</td>)}{actions && <td className="px-5 py-3.5 text-right">{actions(row)}</td>}</tr>)}</tbody></table></div>;
}

export function AddButton({ label = "Add record", onClick }: { label?: string; onClick: () => void }) {
  return <Button onClick={onClick}><Plus className="h-4 w-4" />{label}</Button>;
}
