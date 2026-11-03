import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, BookOpenCheck, CalendarDays, ClipboardCheck, ClipboardList, GraduationCap, LayoutDashboard, ListChecks, Menu, NotebookTabs, PanelLeftClose, Settings, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "./providers";
import { Button, cn } from "../components/ui";

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
const titles: Record<string, string> = Object.fromEntries(navigation.map((item) => [item.to, item.label]));

function Sidebar({ onNavigate, close }: { onNavigate?: () => void; close?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Student");
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ST";
  return <aside className="flex h-full w-[260px] flex-col border-r border-slate-200 bg-white">
    <div className="flex h-[74px] items-center justify-between px-5">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><BookOpenCheck className="h-[18px] w-[18px]" /></span><div><div className="text-[15px] font-semibold tracking-[-0.035em] text-ink">StudyTrack</div><div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">Academic workspace</div></div></div>
      {close && <button aria-label="Close navigation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={onNavigate}><X className="h-4 w-4" /></button>}
    </div>
    <div className="px-4 pb-2 pt-4"><div className="eyebrow px-2">Workspace</div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition", isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-ink")}>
        {({ isActive }) => <><span className={cn("absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full", isActive ? "bg-indigo-600" : "bg-transparent")} /><Icon className={cn("h-[17px] w-[17px]", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} /><span>{label}</span>{isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}</>}
      </NavLink>)}
    </nav>
    <div className="border-t border-slate-100 p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials}</span><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-ink">{name}</div><div className="truncate text-[10px] text-slate-400">{user?.email}</div></div><button title="Sign out" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={async () => { await signOut(); navigate("/login"); }}><PanelLeftClose className="h-4 w-4" /></button></div>
      <div className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Your records are account-scoped</div>
    </div>
  </aside>;
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pathname.startsWith("/students/") ? "Student profile" : titles[pathname] ?? "StudyTrack";
  return <div className="min-h-screen bg-paper">
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block"><Sidebar /></div>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} /><div className="absolute inset-y-0 left-0"><Sidebar close onNavigate={() => setMobileOpen(false)} /></div></div>}
    <div className="min-h-screen lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm md:px-8">
        <div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-4 w-4" /></button><div><div className="text-sm font-semibold text-ink">{title}</div><div className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div></div></div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400"><span className="hidden h-2 w-2 rounded-full bg-emerald-400 sm:block" />Private workspace</div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      <footer className="mx-4 border-t border-slate-200/70 py-5 text-center text-[10px] text-slate-400 md:mx-8">StudyTrack <span className="px-1">·</span> All records are saved to your connected Supabase workspace.</footer>
    </div>
  </div>;
}
