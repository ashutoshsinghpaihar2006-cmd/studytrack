import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, ArrowUpRight, CheckCircle2, LoaderCircle, Plus, Search } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import type { ColumnSpec, DbRow } from "../lib/database.types";

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary:
      "bg-indigo-600 text-white shadow-button hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-600/30",
    secondary:
      "bg-white text-slate-700 shadow-subtle ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:ring-slate-400/30",
    quiet:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70 focus-visible:ring-slate-300",
    danger:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-tight transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  title,
  description,
  action,
}: PropsWithChildren<{
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-4 md:px-6">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone?: "indigo" | "blue" | "amber" | "green";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-500/15",
    blue: "bg-sky-50 text-sky-600 ring-sky-500/15",
    amber: "bg-amber-50 text-amber-600 ring-amber-500/15",
    green: "bg-emerald-50 text-emerald-600 ring-emerald-500/15",
  };

  return (
    <div className="surface surface-interactive p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium tracking-tight text-slate-500">
          {label}
        </span>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl ring-1 ring-inset",
            tones[tone]
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 text-[28px] font-bold tracking-tight text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400 tracking-tight">{detail}</div>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();

  let styles = "bg-slate-100 text-slate-700 ring-slate-500/10";
  let dotColor = "bg-slate-400";

  if (/completed|submitted|present|active/i.test(normalized)) {
    styles = "bg-emerald-50/90 text-emerald-700 ring-emerald-600/20";
    dotColor = "bg-emerald-500";
  } else if (/overdue|absent|missed|below/i.test(normalized)) {
    styles = "bg-rose-50/90 text-rose-700 ring-rose-600/20";
    dotColor = "bg-rose-500";
  } else if (/in progress|late|planned|pending|not started/i.test(normalized)) {
    styles = "bg-amber-50/90 text-amber-700 ring-amber-600/20";
    dotColor = "bg-amber-500";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset tabular-nums",
        styles
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      <span className="capitalize">{value.replaceAll("_", " ")}</span>
    </span>
  );
}

export function LoadingState({
  label = "Loading your academic records…",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-2.5 text-sm text-slate-500">
      <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" />
      <span>{label}</span>
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200/80 bg-rose-50/80 p-3.5 text-sm text-rose-800"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          className="text-xs font-semibold underline hover:text-rose-900"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50/80 ring-1 ring-inset ring-indigo-500/15 text-indigo-600">
        <ArrowUpRight className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {message}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="field-control pl-9 text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export function DataTable({
  columns,
  rows,
  actions,
}: {
  columns: ColumnSpec[];
  rows: DbRow[];
  actions?: (row: DbRow) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr className="table-head">
            {columns.map((column) => (
              <th key={column.key} className="px-5 py-3 font-semibold">
                {column.label}
              </th>
            ))}
            {actions && <th className="px-5 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={String(row.id)}
              className="group transition-colors duration-100 hover:bg-slate-50/70"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-3.5 text-sm text-slate-700">
                  {column.render ? (
                    column.render(row)
                  ) : row[column.key] == null || row[column.key] === "" ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <span className="tabular-nums">{String(row[column.key])}</span>
                  )}
                </td>
              ))}
              {actions && (
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AddButton({
  label = "Add record",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus className="h-4 w-4 -ml-0.5" />
      {label}
    </Button>
  );
}
