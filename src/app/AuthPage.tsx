import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, LockKeyhole } from "lucide-react";
import { useAuth, useRuntimeConnection } from "./providers";
import { Button, InlineError, SuccessNote } from "../components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const { client } = useRuntimeConnection();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (register) {
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) navigate("/dashboard", { replace: true });
        else setSuccess("Your account is created. Check your inbox to confirm, then sign in.");
      } else {
        const { error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        navigate("/dashboard", { replace: true });
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Authentication could not be completed. Please check credentials and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(440px,0.85fr)_1.15fr]">
      <section className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <Link to="/login" className="flex items-center gap-3 w-fit" aria-label="StudyTrack home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-button">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">StudyTrack</span>
        </Link>

        <div className="mx-auto w-full max-w-[390px] py-10">
          <div className="eyebrow mb-2">Student Workspace</div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {register ? "Create your account" : "Sign in to StudyTrack"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {register
              ? "Unify your courses, lecture attendance, and study calendar in one dependable dashboard."
              : "Welcome back. Access your current academic semester."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            {register && (
              <div>
                <label className="field-label" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  className="field-control"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Arjun Mehta"
                />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="email">
                Institutional Email
              </label>
              <input
                id="email"
                required
                type="email"
                autoComplete="email"
                className="field-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@college.edu"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                required
                minLength={6}
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                className="field-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
              />
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <LockKeyhole className="h-3.5 w-3.5 text-slate-400" />
                <span>Encrypted & authenticated via PostgreSQL RLS</span>
              </div>
            </div>

            {error && <InlineError message={error} />}
            {success && <SuccessNote message={success} />}

            <Button className="w-full justify-between" disabled={busy} type="submit" size="lg">
              <span>{busy ? "Authenticating…" : register ? "Create Account" : "Sign In"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {register ? "Already registered? " : "New to StudyTrack? "}
            <Link
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
              to={register ? "/login" : "/register"}
            >
              {register ? "Sign in instead" : "Create an account"}
            </Link>
          </p>
        </div>

        <p className="text-xs text-slate-400">
          StudyTrack · Academic Management & Analytics
        </p>
      </section>

      {/* Hero Visual Panel */}
      <aside className="relative hidden overflow-hidden border-l border-slate-200/80 bg-paper p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-[440px] w-[440px] rounded-full border border-indigo-200/60 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 h-[280px] w-[280px] rounded-full border border-indigo-100/80 pointer-events-none" />

        <div className="relative z-10">
          <span className="eyebrow">Clarity for your semester</span>
          <h2 className="mt-4 max-w-lg text-4xl font-extrabold leading-[1.15] tracking-tight text-ink">
            A reliable system for all your coursework.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
            Track daily class attendance, examination grades, assignment deadlines, and personal focus blocks without distraction.
          </p>
        </div>

        <div className="relative z-10 grid max-w-lg grid-cols-2 gap-3.5">
          {[
            ["01", "Know your attendance", "Never dip below the 75% limit."],
            ["02", "Coursework deadlines", "Stay ahead of overdue assignments."],
            ["03", "Exams & scores", "Track subject-wise percentage marks."],
            ["04", "Focus planner", "Schedule and log manual study hours."],
          ].map(([num, headline, sub]) => (
            <div
              key={num}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-subtle backdrop-blur-sm"
            >
              <div className="font-mono text-xs font-bold text-indigo-600 tabular-nums">
                {num}
              </div>
              <div className="mt-1 text-sm font-bold text-ink tracking-tight">
                {headline}
              </div>
              <div className="mt-0.5 text-xs text-slate-400 leading-snug">
                {sub}
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-2.5 text-xs text-slate-400 font-medium">
          <span className="h-px w-6 bg-indigo-400" />
          <span>Real-time PostgreSQL database synchronization</span>
        </div>
      </aside>
    </div>
  );
}

export function SupabaseSetupPage({ error }: { error?: string | null }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-12">
      <div className="surface w-full max-w-xl p-7 md:p-9 shadow-modal">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/15">
          <BookOpenCheck className="h-6 w-6" />
        </div>
        <div className="eyebrow mt-6">Project Setup</div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Connect your PostgreSQL Workspace
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          StudyTrack stores all your academic records securely in your PostgreSQL database via Supabase.
        </p>
        {error && (
          <div className="mt-5">
            <InlineError message={error} />
          </div>
        )}
        <div className="mt-6 space-y-3 rounded-2xl bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-900/5">
          <p>
            <strong>1.</strong> Verify that <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">SUPABASE_URL</code> and <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">SUPABASE_ANON_KEY</code> are set in your <code className="font-mono text-[11px] text-indigo-700">.env</code> file.
          </p>
          <p>
            <strong>2.</strong> Run <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">supabase/migrations/001_studytrack.sql</code> in your SQL Editor.
          </p>
          <p>
            <strong>3.</strong> Refresh StudyTrack to access your records.
          </p>
        </div>
      </div>
    </main>
  );
}
