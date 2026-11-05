import { useState, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Command,
  Flame,
  GraduationCap,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  NotebookTabs,
  PanelLeftClose,
  Pause,
  Play,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "./providers";
import { cn } from "../components/ui";
import { CommandPalette } from "../components/CommandPalette";
import { FocusTimerModal } from "../components/FocusTimer";
import { KeyboardShortcutsModal } from "../components/KeyboardShortcutsModal";
import type { UserRole } from "../lib/database.types";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const allNavigationItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["admin", "professor", "student"] },
  { label: "User Management", to: "/admin/users", icon: ShieldCheck, roles: ["admin"] },
  { label: "Students", to: "/students", icon: Users, roles: ["admin", "professor"] },
  { label: "Subjects", to: "/subjects", icon: NotebookTabs, roles: ["admin", "professor", "student"] },
  { label: "Class Timetable", to: "/timetable", icon: CalendarRange, roles: ["admin", "professor", "student"] },
  { label: "Attendance", to: "/attendance", icon: ClipboardCheck, roles: ["admin", "professor", "student"] },
  { label: "Assignments", to: "/assignments", icon: ClipboardList, roles: ["admin", "professor", "student"] },
  { label: "Examinations", to: "/examinations", icon: GraduationCap, roles: ["admin", "professor", "student"] },
  { label: "Marks & Performance", to: "/marks", icon: Activity, roles: ["admin", "professor", "student"] },
  { label: "Study Planner", to: "/planner", icon: CalendarDays, roles: ["admin", "student"] },
  { label: "Announcements", to: "/announcements", icon: BellRing, roles: ["admin", "professor", "student"] },
  { label: "Audit Activity Log", to: "/activity-log", icon: ListChecks, roles: ["admin"] },
  { label: "Settings", to: "/settings", icon: Settings, roles: ["admin", "professor", "student"] },
];

function Sidebar({ onNavigate, close }: { onNavigate?: () => void; close?: boolean }) {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const name = String(profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User");
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";

  const navigation = useMemo(() => {
    return allNavigationItems.filter((item) => item.roles.includes(role));
  }, [role]);

  const roleStyles = {
    admin: { label: "Administrator", bg: "bg-purple-100 text-purple-800 border-purple-200", icon: Shield },
    professor: { label: "Professor", bg: "bg-amber-100 text-amber-800 border-amber-200", icon: GraduationCap },
    student: { label: "Student", bg: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Users },
  }[role];

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

      {/* Role Badge Section */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between px-1">
          <div className="eyebrow">Workspace</div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleStyles.bg}`}>
            <roleStyles.icon className="h-2.5 w-2.5" />
            {roleStyles.label}
          </span>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-ink"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 rounded-xl p-2 bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">{name}</div>
              <div className="truncate text-[10px] text-slate-400">{user?.email}</div>
            </div>
          </div>
          <button
            title="Sign out"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
  const location = useLocation();
  const { role } = useAuth();

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/admin/users": "User Management",
    "/students": "Students",
    "/subjects": "Subjects",
    "/timetable": "Class Timetable",
    "/attendance": "Attendance",
    "/assignments": "Assignments",
    "/examinations": "Examinations",
    "/marks": "Marks & Performance",
    "/planner": "Study Planner",
    "/announcements": "Announcements",
    "/activity-log": "Audit Activity Log",
    "/settings": "Settings",
  };

  const currentTitle = titles[location.pathname] ?? "Academic Workspace";

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex shadow-modal">
            <Sidebar close onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-ink md:text-xl">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden rounded bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-xs sm:inline">
                Ctrl+K
              </kbd>
            </button>

            {role === "student" && (
              <button
                onClick={() => setTimerOpen(true)}
                title="Focus Study Timer"
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Timer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Focus Timer</span>
              </button>
            )}

            <button
              onClick={() => setShortcutsOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FocusTimerModal
        open={timerOpen}
        onClose={() => setTimerOpen(false)}
        timerState={timerState}
        onUpdateState={setTimerState}
      />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
