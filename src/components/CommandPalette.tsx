import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Command,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookTabs,
  Plus,
  Search,
  Settings,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../app/providers";
import { useTableRows } from "./CrudPage";

type CommandItem = {
  id: string;
  category: "Navigation" | "Actions" | "Subjects" | "Students" | "Assignments";
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

export function CommandPalette({
  open,
  onClose,
  onOpenFocusTimer,
}: {
  open: boolean;
  onClose: () => void;
  onOpenFocusTimer?: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const subjects = useTableRows("subjects");
  const students = useTableRows("students");
  const assignments = useTableRows("assignments");

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Actions
      {
        id: "act-attendance",
        category: "Actions",
        label: "Mark Today's Class Attendance",
        sublabel: "Log lecture presence or timetable auto-checkin",
        icon: <ClipboardCheck className="h-4 w-4 text-emerald-600" />,
        onSelect: () => {
          navigate("/attendance");
          onClose();
        },
      },
      {
        id: "act-timer",
        category: "Actions",
        label: "Start Focus Study Timer (Pomodoro)",
        sublabel: "Track real-time study sessions & log to database",
        icon: <Timer className="h-4 w-4 text-indigo-600" />,
        onSelect: () => {
          onClose();
          onOpenFocusTimer?.();
        },
      },
      {
        id: "act-planner",
        category: "Actions",
        label: "Plan New Study Session",
        sublabel: "Schedule a focus block on the calendar",
        icon: <CalendarDays className="h-4 w-4 text-blue-600" />,
        onSelect: () => {
          navigate("/planner");
          onClose();
        },
      },
      {
        id: "act-classroom",
        category: "Actions",
        label: "Sync with Google Classroom",
        sublabel: "Import latest coursework and submission statuses",
        icon: <Sparkles className="h-4 w-4 text-amber-600" />,
        onSelect: () => {
          navigate("/assignments");
          onClose();
        },
      },

      // Navigation
      {
        id: "nav-dash",
        category: "Navigation",
        label: "Dashboard",
        sublabel: "Weekly overview and academic metrics",
        icon: <LayoutDashboard className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/dashboard");
          onClose();
        },
      },
      {
        id: "nav-att",
        category: "Navigation",
        label: "Attendance & Timetable",
        sublabel: "Class checkins, weekly schedule & threshold warnings",
        icon: <ClipboardCheck className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/attendance");
          onClose();
        },
      },
      {
        id: "nav-asg",
        category: "Navigation",
        label: "Assignments & Projects",
        sublabel: "Deadlines, submission states, and Classroom sync",
        icon: <ClipboardList className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/assignments");
          onClose();
        },
      },
      {
        id: "nav-planner",
        category: "Navigation",
        label: "Study Planner",
        sublabel: "Day, week, and month study session calendar",
        icon: <CalendarDays className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/planner");
          onClose();
        },
      },
      {
        id: "nav-marks",
        category: "Navigation",
        label: "Marks & Performance",
        sublabel: "Examination scores and subject grade averages",
        icon: <Activity className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/marks");
          onClose();
        },
      },
      {
        id: "nav-students",
        category: "Navigation",
        label: "Students Directory",
        sublabel: "Student profiles, course enrollments & attendance",
        icon: <Users className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/students");
          onClose();
        },
      },
      {
        id: "nav-sub",
        category: "Navigation",
        label: "Subjects Catalogue",
        sublabel: "Credit requirements, course codes & faculty",
        icon: <NotebookTabs className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/subjects");
          onClose();
        },
      },
      {
        id: "nav-top",
        category: "Navigation",
        label: "Topics & Syllabus",
        sublabel: "Milestones, progress bars & completion dates",
        icon: <ListChecks className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/topics");
          onClose();
        },
      },
      {
        id: "nav-exams",
        category: "Navigation",
        label: "Examinations",
        sublabel: "Midterms, practicals, and final exam schedules",
        icon: <GraduationCap className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/examinations");
          onClose();
        },
      },
      {
        id: "nav-settings",
        category: "Navigation",
        label: "Settings",
        sublabel: "PostgreSQL workspace status and account preferences",
        icon: <Settings className="h-4 w-4 text-slate-500" />,
        onSelect: () => {
          navigate("/settings");
          onClose();
        },
      },
    ];

    // Add Live Subjects from PostgreSQL
    for (const sub of subjects.data ?? []) {
      list.push({
        id: `subj-${sub.id}`,
        category: "Subjects",
        label: String(sub.name),
        sublabel: `${sub.code} · ${sub.credits} Credits · ${sub.faculty ?? "Faculty"}`,
        icon: <NotebookTabs className="h-4 w-4 text-indigo-600" />,
        onSelect: () => {
          navigate("/subjects");
          onClose();
        },
      });
    }

    // Add Live Students
    for (const st of students.data ?? []) {
      list.push({
        id: `stud-${st.id}`,
        category: "Students",
        label: String(st.full_name),
        sublabel: `${st.student_code} · ${st.course}`,
        icon: <Users className="h-4 w-4 text-blue-600" />,
        onSelect: () => {
          navigate(`/students/${st.id}`);
          onClose();
        },
      });
    }

    // Add Live Assignments
    for (const asg of assignments.data ?? []) {
      list.push({
        id: `asg-${asg.id}`,
        category: "Assignments",
        label: String(asg.title),
        sublabel: `Status: ${asg.status} · Due: ${asg.submission_deadline}`,
        icon: <ClipboardList className="h-4 w-4 text-amber-600" />,
        onSelect: () => {
          navigate("/assignments");
          onClose();
        },
      });
    }

    return list;
  }, [assignments.data, navigate, onClose, onOpenFocusTimer, students.data, subjects.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].onSelect();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, onClose, open, selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-16 sm:pt-24 backdrop-blur-sm transition-opacity"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 bg-slate-50/50">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm font-medium text-ink placeholder:text-slate-400 outline-none"
            placeholder="Type a command, subject, student, or search anything…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching commands or academic records found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                      isSelected
                        ? "bg-indigo-50/80 text-indigo-900 ring-1 ring-inset ring-indigo-500/15"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => item.onSelect()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          isSelected ? "bg-white shadow-subtle" : "bg-slate-100"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-ink">
                          {item.label}
                        </div>
                        {item.sublabel && (
                          <div className="truncate text-[10px] text-slate-400">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                        {item.category}
                      </span>
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200 font-mono text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200 font-mono text-[10px]">
                ↓
              </kbd>{" "}
              to navigate
            </span>
            <span>
              <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              to select
            </span>
          </div>
          <span>StudyTrack Instant Action</span>
        </div>
      </div>
    </div>
  );
}
