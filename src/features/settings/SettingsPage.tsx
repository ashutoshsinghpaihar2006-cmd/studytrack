import { useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Lock,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth, useRuntimeConnection } from "../../app/providers";
import { Button, InlineError, PageHeader, Panel, SuccessNote } from "../../components/ui";
import { useTableRows } from "../../components/CrudPage";
import { formatDate } from "../../lib/format";

export function SettingsPage() {
  const { user, profile, role, isApproved, signOut, client, logActivity } = useAuth();
  const { config } = useRuntimeConnection();
  const queryClient = useQueryClient();

  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Copy SQL state
  const [copied, setCopied] = useState(false);

  const tables = [
    useTableRows("students"),
    useTableRows("subjects"),
    useTableRows("student_subjects"),
    useTableRows("topics"),
    useTableRows("attendance"),
    useTableRows("assignments"),
    useTableRows("exams"),
    useTableRows("study_sessions"),
    useTableRows("marks"),
  ];
  const isLoading = tables.some((query) => query.isLoading);
  const hasTableError = tables.some((query) => query.isError);
  const existingRecords = tables.reduce((sum, query) => sum + (query.data?.length ?? 0), 0);
  const canSeed = !isLoading && !hasTableError && existingRecords === 0;
  const email = user?.email ?? "";

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }

    setPwdBusy(true);
    setPwdError("");
    setPwdSuccess("");

    try {
      const { error: err } = await client.auth.updateUser({ password: newPassword });
      if (err) throw err;
      setPwdSuccess("Your password was updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      await logActivity("Changed account password", "auth");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwdBusy(false);
    }
  }

  async function loadSampleData() {
    if (!client || !canSeed) return;
    if (
      !window.confirm(
        "Add the sample student, subjects, attendance, assessments, and study sessions to this empty workspace? These records will be editable and deletable like your own."
      )
    )
      return;
    setSeeding(true);
    setError("");
    setSuccess("");
    try {
      const { data, error: seedError } = await client.rpc("studytrack_load_sample_data");
      if (seedError) throw seedError;
      await queryClient.invalidateQueries();
      const summary = data as Record<string, number> | null;
      setSuccess(
        `Sample dataset added: ${summary?.subjects ?? 4} subjects, ${
          summary?.attendance_records ?? 40
        } attendance records, and related study records. Dashboard totals now come from Supabase.`
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Sample data could not be added. Confirm both SQL migrations have been applied."
      );
    } finally {
      setSeeding(false);
    }
  }

  const promoteSql = `UPDATE public.profiles SET role = 'admin', approved = true WHERE id = '${user?.id ?? "your-user-uuid"}';`;

  function copyPromoteSql() {
    navigator.clipboard.writeText(promoteSql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const accountCreated = useMemo(
    () => (user?.created_at ? formatDate(user.created_at) : "—"),
    [user?.created_at]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace Preferences"
        title="Account & System Settings"
        description="Manage your institutional credentials, security settings, and database configurations."
      />

      {error && <InlineError message={error} />}
      {success && <SuccessNote message={success} />}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Account Profile Panel */}
        <Panel title="Account Profile" description="Your institutional authentication identity.">
          <div className="space-y-5 p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <div className="text-base font-bold text-ink">
                  {String(profile?.full_name ?? user?.user_metadata?.full_name ?? "User")}
                </div>
                <div className="text-xs text-slate-400">{email}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="eyebrow">Assigned Role</div>
                <div className="mt-1 text-xs font-bold text-indigo-700 capitalize">
                  {role}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="eyebrow">Approval Status</div>
                <div className="mt-1 text-xs font-bold">
                  {isApproved ? (
                    <span className="text-emerald-700">Approved</span>
                  ) : (
                    <span className="text-amber-600">Pending Review</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 col-span-2 sm:col-span-1">
                <div className="eyebrow">Joined Date</div>
                <div className="mt-1 text-xs font-medium text-slate-700">{accountCreated}</div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await signOut();
                  window.location.assign("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </Panel>

        {/* Change Password Panel */}
        <Panel title="Security & Password" description="Update your account login password.">
          <form onSubmit={handlePasswordChange} className="space-y-4 p-5 md:p-6">
            {pwdError && <InlineError message={pwdError} />}
            {pwdSuccess && <SuccessNote message={pwdSuccess} />}

            <div>
              <label className="field-label" htmlFor="newPwd">
                New Password
              </label>
              <input
                id="newPwd"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="field-control"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="confirmPwd">
                Confirm New Password
              </label>
              <input
                id="confirmPwd"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="field-control"
              />
            </div>

            <Button type="submit" disabled={pwdBusy || !newPassword}>
              <Lock className="h-4 w-4" />
              {pwdBusy ? "Updating Password..." : "Change Password"}
            </Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Supabase Connection Panel */}
        <Panel title="PostgreSQL Database Connection" description="Row-level security enforces access boundary.">
          <div className="space-y-4 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">
                  {config?.configured ? "Connected to Supabase" : "Supabase credentials missing"}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  {config?.configured
                    ? "PostgreSQL database actively connected. All authentication and role policies are verified at query time."
                    : "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env file."}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-1">
              <div>
                <Database className="mr-1.5 inline h-3.5 w-3.5 text-indigo-500" />
                Schema: <code className="font-mono text-[11px] text-indigo-700">001_studytrack.sql</code>
              </div>
              <div>
                <Shield className="mr-1.5 inline h-3.5 w-3.5 text-indigo-500" />
                RBAC Migration: <code className="font-mono text-[11px] text-indigo-700">004_role_based_access.sql</code>
              </div>
            </div>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open Supabase Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Panel>

        {/* First Admin Provisioning Helper */}
        <Panel
          title="Administrator Seeding"
          description="The first admin is provisioned manually in the database; self-registration as admin is prohibited."
        >
          <div className="space-y-4 p-5 md:p-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              To promote your current account to an Administrator, execute this SQL query once in your{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-indigo-600 underline"
              >
                Supabase SQL Editor
              </a>:
            </p>

            <div className="relative rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-100 overflow-x-auto">
              <code>{promoteSql}</code>
            </div>

            <Button variant="secondary" onClick={copyPromoteSql}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied to clipboard!" : "Copy SQL Statement"}
            </Button>
          </div>
        </Panel>
      </div>

      {/* Demo Evaluation Data Panel */}
      <Panel title="Evaluation Sample Data" description="A realistic starting workspace, inserted only when you choose it.">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">
                {isLoading
                  ? "Checking for records..."
                  : hasTableError
                  ? "Apply the database migrations first"
                  : canSeed
                  ? "Ready to load the demo dataset"
                  : "Sample data is available only for an empty workspace"}
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                {hasTableError
                  ? "StudyTrack cannot access the required tables. Run 001_studytrack.sql in your Supabase SQL Editor, then refresh this page."
                  : canSeed
                  ? "Adds one sample student, four subjects, topics, attendance, assignments, exams, marks, and study sessions."
                  : "This action is disabled because academic records already exist. It never overwrites or duplicates an existing workspace."}
              </p>
            </div>
          </div>
          <Button disabled={!canSeed || seeding || !client} onClick={() => void loadSampleData()}>
            {seeding ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading sample data...
              </>
            ) : (
              <>
                <BookOpenCheck className="h-4 w-4" />
                Load sample data
              </>
            )}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
