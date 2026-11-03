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

  useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [navigate, user]);

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
        else setSuccess("Your account is ready. Check your email to confirm it, then sign in.");
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        navigate("/dashboard", { replace: true });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(420px,0.85fr)_1.15fr]">
    <section className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
      <Link to="/login" className="flex items-center gap-3" aria-label="StudyTrack home">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><BookOpenCheck className="h-5 w-5" /></span>
        <span className="text-lg font-semibold tracking-[-0.04em] text-ink">StudyTrack</span>
      </Link>
      <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-12">
        <div className="eyebrow mb-3">Your academic workspace</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-ink">{register ? "Create your account" : "Sign in to StudyTrack"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{register ? "Bring your subjects, attendance, and study plan into one clear view." : "Pick up where your academic week left off."}</p>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          {register && <div><label className="field-label" htmlFor="fullName">Full name</label><input id="fullName" required autoComplete="name" className="field-control" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></div>}
          <div><label className="field-label" htmlFor="email">Email address</label><input id="email" required type="email" autoComplete="email" className="field-control" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@college.edu" /></div>
          <div><label className="field-label" htmlFor="password">Password</label><input id="password" required minLength={6} type="password" autoComplete={register ? "new-password" : "current-password"} className="field-control" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400"><LockKeyhole className="h-3 w-3" /> Your account is secured by Supabase Authentication.</div></div>
          {error && <InlineError message={error} />}
          {success && <SuccessNote message={success} />}
          <Button className="w-full justify-between" disabled={busy} type="submit">{busy ? "Please wait…" : register ? "Create account" : "Sign in"}<ArrowRight className="h-4 w-4" /></Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{register ? "Already have an account? " : "New to StudyTrack? "}<Link className="font-semibold text-indigo-600 hover:text-indigo-700" to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link></p>
      </div>
      <p className="text-xs text-slate-400">StudyTrack · Student Academic Management System</p>
    </section>
    <aside className="relative hidden overflow-hidden border-l border-slate-100 bg-paper p-12 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-[430px] w-[430px] rounded-full border border-indigo-100/80" />
      <div className="absolute -right-8 -top-8 h-[270px] w-[270px] rounded-full border border-indigo-100/80" />
      <div className="relative z-10"><span className="eyebrow">A steady system for a busy semester</span><h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.06em] text-ink">Make room for the work that matters.</h2><p className="mt-5 max-w-md text-base leading-7 text-slate-500">Keep class records, upcoming deadlines, and your own study sessions organized in one place.</p></div>
      <div className="relative z-10 grid max-w-xl grid-cols-2 gap-3">
        {[["01", "Know your attendance"], ["02", "Keep deadlines visible"], ["03", "Track every result"], ["04", "Plan study time manually"]].map(([number, text]) => <div key={number} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-mono text-xs text-indigo-600">{number}</div><div className="mt-2 text-sm font-semibold text-ink">{text}</div></div>)}
      </div>
      <div className="relative z-10 flex items-center gap-3 text-xs text-slate-400"><span className="h-px w-8 bg-indigo-300" />No automated recommendations. Your plan stays yours.</div>
    </aside>
  </div>;
}

export function SupabaseSetupPage({ error }: { error?: string | null }) {
  return <main className="grid min-h-screen place-items-center bg-paper px-5 py-12">
    <div className="surface w-full max-w-xl p-7 md:p-9">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><BookOpenCheck className="h-6 w-6" /></div>
      <div className="eyebrow mt-6">Project setup</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Connect your Supabase project</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">StudyTrack uses your Supabase project for sign-in and persistent academic records. Add your project URL and public anon key in the protected project settings; never use a service-role key in the browser.</p>
      {error && <div className="mt-5"><InlineError message={error} /></div>}
      <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p><strong>1.</strong> Set <code className="font-mono text-xs text-indigo-700">SUPABASE_URL</code> and <code className="font-mono text-xs text-indigo-700">SUPABASE_ANON_KEY</code> in protected project secrets.</p>
        <p><strong>2.</strong> Run <code className="font-mono text-xs text-indigo-700">supabase/migrations/001_studytrack.sql</code> in the Supabase SQL Editor to create the tables and Row Level Security policies.</p>
        <p><strong>3.</strong> Refresh StudyTrack to use your connected database.</p>
      </div>
      <p className="mt-5 text-xs text-slate-400">No demo data or dashboard totals are generated until you choose to load the sample dataset after signing in.</p>
    </div>
  </main>;
}
