import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CheckCircle2, Database, ExternalLink, KeyRound, LoaderCircle, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth, useRuntimeConnection } from "../../app/providers";
import { Button, InlineError, PageHeader, Panel, SuccessNote } from "../../components/ui";
import { useTableRows } from "../../components/CrudPage";
import { formatDate } from "../../lib/format";

export function SettingsPage() {
  const { user, signOut, client } = useAuth();
  const { config } = useRuntimeConnection();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const tables = [useTableRows("students"), useTableRows("subjects"), useTableRows("student_subjects"), useTableRows("topics"), useTableRows("attendance"), useTableRows("assignments"), useTableRows("exams"), useTableRows("study_sessions"), useTableRows("marks")];
  const isLoading = tables.some((query) => query.isLoading);
  const hasTableError = tables.some((query) => query.isError);
  const existingRecords = tables.reduce((sum, query) => sum + (query.data?.length ?? 0), 0);
  const canSeed = !isLoading && !hasTableError && existingRecords === 0;
  const email = user?.email ?? "";

  async function loadSampleData() {
    if (!client || !canSeed) return;
    if (!window.confirm("Add the sample student, subjects, attendance, assessments, and study sessions to this empty workspace? These records will be editable and deletable like your own.")) return;
    setSeeding(true);
    setError("");
    setSuccess("");
    try {
      const { data, error: seedError } = await client.rpc("studytrack_load_sample_data");
      if (seedError) throw seedError;
      await queryClient.invalidateQueries();
      const summary = data as Record<string, number> | null;
      setSuccess(`Sample dataset added: ${summary?.subjects ?? 4} subjects, ${summary?.attendance_records ?? 40} attendance records, and related study records. Dashboard totals now come from Supabase.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sample data could not be added. Confirm both SQL migrations have been applied.");
    } finally {
      setSeeding(false);
    }
  }

  const accountCreated = useMemo(() => user?.created_at ? formatDate(user.created_at) : "—", [user?.created_at]);
  return <div className="space-y-6">
    <PageHeader eyebrow="Workspace preferences" title="Settings" description="Review your account connection and set up an evaluation dataset when the workspace is empty." />
    {error && <InlineError message={error} />}{success && <SuccessNote message={success} />}
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Account profile" description="Supabase Authentication identity."><div className="space-y-4 p-5 md:p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><KeyRound className="h-5 w-5" /></div><div><div className="text-sm font-semibold text-ink">{String(user?.user_metadata?.full_name ?? "Student account")}</div><div className="mt-0.5 text-xs text-slate-400">{email}</div></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><div className="eyebrow">Account created</div><div className="mt-1.5 text-xs font-medium text-slate-700">{accountCreated}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="eyebrow">Records in workspace</div><div className="mt-1.5 text-xs font-medium text-slate-700">{isLoading ? "Loading…" : existingRecords}</div></div></div><Button variant="secondary" onClick={async () => { await signOut(); window.location.assign("/login"); }}><LogOut className="h-4 w-4" />Sign out</Button></div></Panel>
      <Panel title="Supabase connection" description="The app uses a public client key plus database-enforced RLS."><div className="space-y-4 p-5 md:p-6"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></div><div><div className="text-sm font-semibold text-ink">{config?.configured ? "Connected to Supabase" : "Supabase credentials missing"}</div><div className="mt-1 text-xs leading-5 text-slate-400">{config?.configured ? "Authentication and data queries use the configured project. Each table enforces account ownership with RLS." : "Add SUPABASE_URL and SUPABASE_ANON_KEY through protected project settings. Do not use a service-role key."}</div></div></div><div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-500"><Database className="mr-2 inline h-3.5 w-3.5 text-indigo-500" />Migration: <code className="font-mono text-[10px] text-indigo-700">supabase/migrations/001_studytrack.sql</code><br/><span className="ml-6">Optional seeding function: <code className="font-mono text-[10px] text-indigo-700">002_studytrack_sample_data.sql</code></span></div><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">Open Supabase Dashboard<ExternalLink className="h-3.5 w-3.5" /></a></div></Panel>
    </div>
    <Panel title="Evaluation sample data" description="A realistic starting workspace, inserted only when you choose it.">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Sparkles className="h-5 w-5" /></div><div><div className="text-sm font-semibold text-ink">{isLoading ? "Checking for records…" : hasTableError ? "Apply the database migrations first" : canSeed ? "Ready to load the demo dataset" : "Sample data is available only for an empty workspace"}</div><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{hasTableError ? "StudyTrack cannot access the required tables. Run 001_studytrack.sql and 002_studytrack_sample_data.sql in your Supabase SQL Editor, then refresh this page." : canSeed ? "Adds one sample student, four subjects, topics, attendance, assignments, exams, marks, and study sessions. Records go through a signed-in Supabase function and can be edited or deleted normally." : "This action is disabled because academic records already exist. It never overwrites or duplicates an existing workspace."}</p></div></div><Button disabled={!canSeed || seeding || !client} onClick={() => void loadSampleData()}>{seeding ? <><LoaderCircle className="h-4 w-4 animate-spin" />Loading sample data…</> : <><BookOpenCheck className="h-4 w-4" />Load sample data</>}</Button></div>
      {!canSeed && !isLoading && <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />No records were changed. You can continue editing your existing data.</div>}
    </Panel>
  </div>;
}
