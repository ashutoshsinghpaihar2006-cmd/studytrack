import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../app/providers";
import type { ColumnSpec, DbRow, FieldSpec, TableName } from "../lib/database.types";
import { RecordDialog, type FormValues } from "./RecordDialog";
import {
  AddButton,
  DataTable,
  EmptyState,
  InlineError,
  LoadingState,
  PageHeader,
  Panel,
  SearchBox,
  StatusBadge,
  SuccessNote,
  Button,
} from "./ui";

export function useTableRows(table: TableName) {
  const { client, user } = useAuth();
  return useQuery({
    queryKey: ["table", user?.id ?? "signed-out", table],
    enabled: Boolean(client && user),
    queryFn: async () => {
      if (!client || !user) throw new Error("Sign in to access your academic records.");
      const { data, error } = await client.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbRow[];
    },
  });
}

export function CrudPage({
  title,
  eyebrow,
  description,
  table,
  fields,
  columns,
  searchKeys,
  searchPlaceholder,
  rowFilter,
  emptyTitle,
  emptyMessage,
  addLabel,
  defaults,
  transformValues,
  hideHeader,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  table: TableName;
  fields: FieldSpec[];
  columns: ColumnSpec[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  rowFilter?: (row: DbRow) => boolean;
  emptyTitle: string;
  emptyMessage: string;
  addLabel?: string;
  defaults?: FormValues;
  transformValues?: (values: FormValues) => FormValues;
  hideHeader?: boolean;
}) {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError, error, refetch } = useTableRows(table);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DbRow | null>(null);
  const [notice, setNotice] = useState("");
  const [operationError, setOperationError] = useState("");

  const mutation = useMutation({
    mutationFn: async ({ values, id }: { values: FormValues; id?: string }) => {
      if (!client || !user) throw new Error("Sign in before changing records.");
      const prepared = transformValues ? transformValues(values) : values;
      const writable = { ...prepared } as Record<string, unknown>;
      delete writable.id;
      delete writable.owner_id;
      delete writable.created_at;
      delete writable.updated_at;
      if (id) {
        const { error: updateError } = await client.from(table).update(writable).eq("id", id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await client.from(table).insert({ ...writable, owner_id: user.id });
        if (insertError) throw insertError;
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries();
      setDialogOpen(false);
      setEditing(null);
      setOperationError("");
      setNotice(variables.id ? "Changes saved successfully." : "Record created.");
      window.setTimeout(() => setNotice(""), 3500);
    },
    onError: (reason) =>
      setOperationError(reason instanceof Error ? reason.message : "The record could not be saved."),
  });

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!rowFilter || rowFilter(row)) &&
        (!normalized ||
          (searchKeys ?? columns.map((column) => column.key)).some((key) =>
            String(row[key] ?? "").toLowerCase().includes(normalized)
          ))
    );
  }, [columns, rowFilter, rows, search, searchKeys]);

  async function remove(row: DbRow) {
    if (!client) return;
    if (
      !window.confirm(
        "Delete this record? Related items may also be removed according to database foreign key constraints."
      )
    )
      return;
    setOperationError("");
    const { error: deleteError } = await client.from(table).delete().eq("id", row.id);
    if (deleteError) setOperationError(deleteError.message);
    else {
      await queryClient.invalidateQueries();
      setNotice("Record deleted.");
      window.setTimeout(() => setNotice(""), 3500);
    }
  }

  const allColumns = useMemo(
    () =>
      columns.map((column) =>
        column.key === "status" && !column.render
          ? {
              ...column,
              render: (row: DbRow) => <StatusBadge value={String(row.status ?? "—")} />,
            }
          : column
      ),
    [columns]
  );

  return (
    <>
      {!hideHeader && (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <AddButton
              label={addLabel ?? `Add ${title.toLowerCase().replace(/s$/, "")}`}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
                setOperationError("");
              }}
            />
          }
        />
      )}
      {notice && (
        <div className="mb-4">
          <SuccessNote message={notice} />
        </div>
      )}
      {operationError && (
        <div className="mb-4">
          <InlineError message={operationError} />
        </div>
      )}
      {isError && (
        <div className="mb-4">
          <InlineError
            message={error instanceof Error ? error.message : "Could not load records."}
            onRetry={() => void refetch()}
          />
        </div>
      )}
      <Panel
        className="overflow-hidden"
        title={`${filtered.length} ${filtered.length === 1 ? "record" : "records"}`}
        description="Records are securely synced with your PostgreSQL database."
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder ?? `Filter ${title.toLowerCase()}…`}
          />
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {rows.length} total in database
          </span>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : filtered.length ? (
          <DataTable
            columns={allColumns}
            rows={filtered}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label="Edit record"
                  title="Edit"
                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={() => {
                    setEditing(row);
                    setDialogOpen(true);
                    setOperationError("");
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label="Delete record"
                  title="Delete"
                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => void remove(row)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        ) : (
          <EmptyState
            title={search ? "No matches found" : emptyTitle}
            message={search ? "Try searching with a different term." : emptyMessage}
            action={
              !search ? (
                <AddButton
                  label={addLabel ?? "Add first record"}
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                />
              ) : undefined
            }
          />
        )}
      </Panel>
      <RecordDialog
        open={dialogOpen}
        title={editing ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`}
        description="Records are saved directly to your PostgreSQL workspace."
        fields={fields}
        initialValues={
          editing
            ? Object.fromEntries(
                fields.map((field) => [
                  field.name,
                  (editing[field.name] as string | number | null) ?? "",
                ])
              )
            : defaults
        }
        busy={mutation.isPending}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={(values) => mutation.mutateAsync({ values, id: editing?.id })}
      />
    </>
  );
}
