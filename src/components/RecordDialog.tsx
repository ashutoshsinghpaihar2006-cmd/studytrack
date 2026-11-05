import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { FieldSpec } from "../lib/database.types";
import { Button } from "./ui";

export type FormValues = Record<string, string | number | null>;

export function RecordDialog({
  open,
  title,
  description,
  fields,
  initialValues,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  description?: string;
  fields: FieldSpec[];
  initialValues?: FormValues;
  busy?: boolean;
  onClose: () => void;
  onSave: (values: FormValues) => Promise<void> | void;
}) {
  const [values, setValues] = useState<FormValues>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const base: FormValues = {};
      for (const field of fields) base[field.name] = initialValues?.[field.name] ?? "";
      setValues(base);
      setError("");
    }
  }, [open, fields, initialValues]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const field of fields) {
      const value = values[field.name];
      if (field.required && (value === "" || value === null || value === undefined)) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.kind === "number" && value !== "" && value !== null && value !== undefined) {
        const numeric = Number(value);
        if (
          !Number.isFinite(numeric) ||
          (field.min !== undefined && numeric < field.min) ||
          (field.max !== undefined && numeric > field.max)
        ) {
          setError(
            `${field.label} must be a valid number${
              field.min !== undefined ? ` (minimum ${field.min})` : ""
            }${field.max !== undefined ? ` (maximum ${field.max})` : ""}.`
          );
          return;
        }
      }
    }

    const payload: FormValues = {};
    for (const field of fields) {
      const value = values[field.name];
      payload[field.name] =
        field.kind === "number"
          ? value === "" || value === null
            ? null
            : Number(value)
          : value === ""
          ? null
          : value ?? null;
    }

    setError("");
    try {
      await onSave(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this record.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm transition-opacity duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-dialog-title"
        className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div>
            <h2
              id="record-dialog-title"
              className="text-base font-bold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            aria-label="Close dialog"
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 active:scale-95 transition-all"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.kind === "textarea" ? "sm:col-span-2" : ""}
              >
                <label className="field-label" htmlFor={`field-${field.name}`}>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-rose-500">*</span>
                  )}
                </label>
                {field.kind === "textarea" ? (
                  <textarea
                    id={`field-${field.name}`}
                    required={field.required}
                    rows={3}
                    className="field-control resize-y"
                    placeholder={field.placeholder}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                  />
                ) : field.kind === "select" ? (
                  <select
                    id={`field-${field.name}`}
                    required={field.required}
                    className="field-control"
                    value={String(values[field.name] ?? "")}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`field-${field.name}`}
                    required={field.required}
                    type={field.kind ?? "text"}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="field-control"
                    placeholder={field.placeholder}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                  />
                )}
                {field.helper && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {field.helper}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              variant="secondary"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save record"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
