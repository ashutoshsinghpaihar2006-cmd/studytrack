import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Command,
  Flame,
  GraduationCap,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  Menu,
  NotebookTabs,
  PanelLeftClose,
  Pause,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Timer,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "./providers";
import { cn } from "../components/ui";
import { CommandPalette } from "../components/CommandPalette";
import { FocusTimerModal } from "../components/FocusTimer";
import { KeyboardShortcutsModal } from "../components/KeyboardShortcutsModal";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Students", to: "/students", icon: Users },
  { label: "Subjects", to: "/subjects", icon: NotebookTabs },
  { label: "Topics", to: "/topics", icon: ListChecks },
  { label: "Attendance", to: "/attendance", icon: ClipboardCheck },
  { label: "Assignments", to: "/assignments", icon: ClipboardList },
  { label: "Examinations", to: "/examinations", icon: GraduationCap },
  { label: "Marks & Performance", to: "/marks", icon: Activity },
  { label: "Study Planner", to: "/planner", icon: CalendarDays },
  { label: "Settings", to: "/settings", icon: Settings },
];

const titles: Record<string, string> = Object.fromEntries(
  navigation.map((item) => [item.to, item.label])
);

function Sidebar({ onNavigate, close }: { onNavigate?: () => void; close?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Student");
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-slate-200/80 bg-white">
      {/* Brand Header */}
      <div className="flex h-[72px] items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-button">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-ink">
              StudyTrack
            </div>
            <div className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Academic Hub
            </div>
          </div>
        </div>
        {close && (
          <button
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 active:scale-95"
            onClick={onNavigate}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav Section */}
      <div className="px-4 pt-4 pb-2">
        <div className="eyebrow px-2">Workspace Modules</div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 ease-out active:scale-[0.99]",
                isActive
                  ? "bg-indigo-50/80 text-indigo-700 font-semibold ring-1 ring-inset ring-indigo-500/10 shadow-sm shadow-indigo-100/30"
                  : "text-slate-600 hover:bg-slate-50 hover:text-ink"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors duration-150",
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Security Footer */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center gap-3 rounded-xl p-2 bg-white ring-1 ring-slate-900/5 shadow-subtle">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 font-mono text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/10">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-ink">{name}</div>
            <div className="truncate font-mono text-[10px] text-slate-400">
              {user?.email}
            </div>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>PostgreSQL RLS Protected</span>
        </div>
      </div>
    </aside>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = pathname.startsWith("/students/")
    ? "Student profile"
    : titles[pathname] ?? "StudyTrack";

  // Focus Timer persistent state
  const [timerState, setTimerState] = useState<{
    isRunning: boolean;
    timeLeft: number;
    initialDuration: number;
    mode: "focus25" | "focus50" | "break5";
    subjectId: string;
    notes: string;
  }>({
    isRunning: false,
    timeLeft: 25 * 60,
    initialDuration: 25 * 60,
    mode: "focus25",
    subjectId: "",
    notes: "",
  });

  // Ticking effect for Pomodoro
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerState.isRunning && timerState.timeLeft > 0) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          if (prev.timeLeft <= 1) {
            return { ...prev, timeLeft: 0, isRunning: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.timeLeft]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    let lastKey = "";
    let lastTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when user is typing in form controls
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      // '?' hotkey for shortcuts modal
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // 't' for focus timer
      if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusTimerOpen((prev) => !prev);
        return;
      }

      // '/' to open search command palette
      if (e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Sequential shortcuts: G then D (dashboard), G then A (attendance), etc.
      const now = Date.now();
      const currentKey = e.key.toLowerCase();

      if (lastKey === "g" && now - lastTime < 1000) {
        if (currentKey === "d") {
          e.preventDefault();
          navigate("/dashboard");
        } else if (currentKey === "a") {
          e.preventDefault();
          navigate("/attendance");
        } else if (currentKey === "h") {
          e.preventDefault();
          navigate("/assignments");
        } else if (currentKey === "p") {
          e.preventDefault();
          navigate("/planner");
        } else if (currentKey === "m") {
          e.preventDefault();
          navigate("/marks");
        } else if (currentKey === "s") {
          e.preventDefault();
          navigate("/students");
        } else if (currentKey === "c") {
          e.preventDefault();
          navigate("/subjects");
        } else if (currentKey === "t") {
          e.preventDefault();
          navigate("/topics");
        }
        lastKey = "";
        return;
      }

      lastKey = currentKey;
      lastTime = now;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const timerMins = Math.floor(timerState.timeLeft / 60);
  const timerSecs = timerState.timeLeft % 60;
  const timerDisplay = `${String(timerMins).padStart(2, "0")}:${String(timerSecs).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-paper">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar close onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-h-screen lg:pl-[260px]">
        {/* Interactive Sticky Header */}
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 active:scale-95 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <div className="text-sm font-bold tracking-tight text-ink">{title}</div>
              <div className="text-[11px] font-medium text-slate-400">
                {new Intl.DateTimeFormat("en", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                }).format(new Date())}
              </div>
            </div>
          </div>

          {/* Interactive Middle Actions (Search / Timer / Hotkeys) */}
          <div className="flex items-center gap-2.5">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-indigo-300 hover:bg-white hover:text-slate-800 shadow-subtle active:scale-98 transition-all"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search or jump to…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                ⌘K
              </kbd>
            </button>

            {/* Interactive Focus Study Timer Pill */}
            <button
              onClick={() => setFocusTimerOpen(true)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-subtle transition-all active:scale-98 ${
                timerState.isRunning
                  ? "bg-indigo-600 text-white shadow-button ring-1 ring-indigo-500"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Flame
                className={`h-3.5 w-3.5 ${
                  timerState.isRunning ? "text-amber-300 animate-bounce" : "text-indigo-600"
                }`}
              />
              <span className="font-mono tabular-nums">{timerDisplay}</span>
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
              className="hidden sm:grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-ink shadow-subtle active:scale-95 transition-all"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {/* PostgreSQL Live Indicator */}
            <div className="hidden lg:flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-900/5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>PostgreSQL Active</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>

        <footer className="mx-4 border-t border-slate-200/60 py-5 text-center text-[11px] text-slate-400 md:mx-8">
          StudyTrack <span className="px-1.5">·</span> Connected to Supabase PostgreSQL workspace
        </footer>
      </div>

      {/* Global Interactive Modals */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenFocusTimer={() => setFocusTimerOpen(true)}
      />

      <FocusTimerModal
        open={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        timerState={timerState}
        onUpdateState={setTimerState}
      />

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
