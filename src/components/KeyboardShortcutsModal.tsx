import { X, Keyboard } from "lucide-react";
import { Button } from "./ui";

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const shortcuts = [
    {
      category: "Global Shortcuts",
      items: [
        { key: "Ctrl + K / ⌘K", desc: "Open Command Palette / Instant Search" },
        { key: "?", desc: "View all keyboard shortcuts" },
        { key: "Esc", desc: "Close any modal, drawer, or search box" },
      ],
    },
    {
      category: "Fast Navigation",
      items: [
        { key: "G then D", desc: "Navigate to Dashboard" },
        { key: "G then A", desc: "Navigate to Attendance & Timetable" },
        { key: "G then H", desc: "Navigate to Assignments & Coursework" },
        { key: "G then P", desc: "Navigate to Study Planner" },
        { key: "G then M", desc: "Navigate to Marks & Performance" },
        { key: "G then S", desc: "Navigate to Student Directory" },
        { key: "G then C", desc: "Navigate to Subjects & Courses" },
        { key: "G then T", desc: "Navigate to Topics & Milestones" },
      ],
    },
    {
      category: "Interactive Utilities",
      items: [
        { key: "T", desc: "Open / Toggle Focus Study Timer" },
        { key: "Space", desc: "Play or pause active Focus Timer" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Keyboard className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-ink">
              Keyboard Navigation &amp; Hotkeys
            </span>
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 active:scale-95 transition-all"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((section) => (
            <div key={section.category} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {section.category}
              </h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 text-xs"
                  >
                    <span className="text-slate-600 font-medium">{item.desc}</span>
                    <kbd className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-800 shadow-subtle ring-1 ring-slate-900/5">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 text-right">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </section>
    </div>
  );
}
