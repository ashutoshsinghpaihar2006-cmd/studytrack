import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth, useRuntimeConnection } from "./providers";
import { Button, InlineError, SuccessNote } from "../components/ui";
import type { UserRole } from "../lib/database.types";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const { client } = useRuntimeConnection();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (user && !busy) {
      navigate("/dashboard", { replace: true });
    }
  }, [busy, navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (register) {
        // Enforce no self-registration as admin
        const signupRole: UserRole = selectedRole === "admin" ? "student" : selectedRole;

        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: signupRole,
            },
          },
        });

        if (authError) throw authError;

        if (signupRole === "professor") {
          setSuccess(
            "Registration submitted! Professor accounts require administrator approval before you can sign in. Please contact your system admin."
          );
        } else if (data.session) {
          navigate("/dashboard", { replace: true });
        } else {
          setSuccess("Account created successfully. Check your email for confirmation, then sign in.");
        }
      } else {
        // Sign in
        const { data: signInData, error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        const userId = signInData.user.id;

        // Fetch user's profile to verify role and approval status
        let profileRole: UserRole = "student";
        let isApproved = true;

        try {
          const { data: profileData, error: profileErr } = await client
            .from("profiles")
            .select("role, approved")
            .eq("id", userId)
            .maybeSingle();

          if (!profileErr && profileData) {
            profileRole = profileData.role as UserRole;
            isApproved = profileData.approved;
          } else {
            // Fallback to user metadata
            const metaRole = signInData.user.user_metadata?.role as UserRole | undefined;
            if (metaRole) profileRole = metaRole;
          }
        } catch {
          const metaRole = signInData.user.user_metadata?.role as UserRole | undefined;
          if (metaRole) profileRole = metaRole;
        }

        // 1. Verify Role Match
        if (profileRole !== selectedRole) {
          await client.auth.signOut();
          const roleLabels: Record<UserRole, string> = {
            admin: "Administrator",
            professor: "Professor",
            student: "Student",
          };
          throw new Error(
            `This account is registered as ${roleLabels[profileRole]}, not ${roleLabels[selectedRole]}. Please select the "${roleLabels[profileRole]}" tab to sign in.`
          );
        }

        // 2. Verify Approval (Professors need admin approval)
        if (profileRole === "professor" && !isApproved) {
          await client.auth.signOut();
          throw new Error(
            "Your Professor account is currently pending administrator approval. Please contact your system admin to activate your access."
          );
        }

        await refreshProfile();
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

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!client || !resetEmail.trim()) return;
    setResetBusy(true);
    setResetError("");
    setResetSuccess("");
    try {
      const { error: resetErr } = await client.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (resetErr) throw resetErr;
      setResetSuccess("Password reset instructions have been sent to your email.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(460px,0.9fr)_1.1fr]">
      <section className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <Link to="/login" className="flex items-center gap-3 w-fit" aria-label="StudyTrack home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-button">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">StudyTrack</span>
        </Link>

        <div className="mx-auto w-full max-w-[420px] py-8">
          <div className="eyebrow mb-2">Role-Based Academic Workspace</div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {register ? "Create your account" : "Sign in to StudyTrack"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {register
              ? "Register as a student or faculty member to access your classes and academic records."
              : "Select your institutional role and sign in to access your portal."}
          </p>

          {/* Role Selector Tabs */}
          <div className="mt-6">
            <label className="field-label mb-2 block">I am signing in as:</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedRole("student")}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedRole === "student"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-ink"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("professor")}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedRole === "professor"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-ink"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Professor
              </button>
              {register ? (
                <div
                  className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-slate-400 bg-slate-100/60 rounded-lg cursor-not-allowed"
                  title="Administrators cannot self-register; they are assigned by system database."
                >
                  <Shield className="h-3 w-3" />
                  Admin *
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    selectedRole === "admin"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-ink"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </button>
              )}
            </div>

            {register && selectedRole === "professor" && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200/60">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Professor registrations require <strong>administrator approval</strong> before you can log in.
                </span>
              </div>
            )}
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
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
                  placeholder={selectedRole === "professor" ? "Prof. Alan Turing" : "e.g. Arjun Mehta"}
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
                placeholder={selectedRole === "professor" ? "professor@university.edu" : "student@college.edu"}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                {!register && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetEmail(email);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                required
                minLength={6}
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                className="field-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            {error && <InlineError message={error} />}
            {success && <SuccessNote message={success} />}

            <Button disabled={busy} type="submit" className="w-full">
              <LockKeyhole className="h-4 w-4" />
              {busy
                ? "Processing..."
                : register
                ? `Create ${selectedRole === "professor" ? "Professor" : "Student"} Account`
                : `Sign in as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
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

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-modal border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Reset your password</h3>
                  <p className="text-xs text-slate-500">Enter your email to receive recovery instructions</p>
                </div>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="resetEmail">
                    Institutional Email
                  </label>
                  <input
                    id="resetEmail"
                    required
                    type="email"
                    className="field-control"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="user@college.edu"
                  />
                </div>
                {resetError && <InlineError message={resetError} />}
                {resetSuccess && <SuccessNote message={resetSuccess} />}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSuccess("");
                      setResetError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={resetBusy}>
                    {resetBusy ? "Sending..." : "Send Reset Email"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          StudyTrack • Academic Management & Analytics
        </p>
      </section>

      {/* Hero Visual Panel */}
      <aside className="relative hidden overflow-hidden border-l border-slate-200/80 bg-paper p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-[440px] w-[440px] rounded-full border border-indigo-200/60 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 h-[280px] w-[280px] rounded-full border border-indigo-100/80 pointer-events-none" />

        <div className="relative z-10">
          <span className="eyebrow">Institutional Access</span>
          <h2 className="mt-4 max-w-lg text-4xl font-extrabold leading-[1.15] tracking-tight text-ink">
            One unified portal for students, faculty, and admins.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
            Role-based security ensures professors manage their syllabus and grading, students track their courses and study targets, and administrators oversee institution operations.
          </p>
        </div>

        <div className="relative z-10 grid max-w-lg grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-subtle backdrop-blur-sm">
            <div className="font-mono text-xs font-bold text-indigo-600">Admin</div>
            <div className="mt-1 text-sm font-bold text-ink">Full Control</div>
            <div className="mt-0.5 text-xs text-slate-400">Manage users, courses & system overview.</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-subtle backdrop-blur-sm">
            <div className="font-mono text-xs font-bold text-indigo-600">Professor</div>
            <div className="mt-1 text-sm font-bold text-ink">Instruction</div>
            <div className="mt-0.5 text-xs text-slate-400">Take attendance, set exams & grade marks.</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-subtle backdrop-blur-sm">
            <div className="font-mono text-xs font-bold text-indigo-600">Student</div>
            <div className="mt-1 text-sm font-bold text-ink">Learning</div>
            <div className="mt-0.5 text-xs text-slate-400">Track attendance, deadlines & study planner.</div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 text-xs text-slate-400 font-medium">
          <span className="h-px w-6 bg-indigo-400" />
          <span>PostgreSQL Row Level Security (RLS) Enforced</span>
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
            <strong>2.</strong> Run <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">supabase/migrations/001_studytrack.sql</code> and <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">004_role_based_access.sql</code> in your SQL Editor.
          </p>
          <p>
            <strong>3.</strong> Refresh StudyTrack to access your records.
          </p>
        </div>
      </div>
    </main>
  );
}
