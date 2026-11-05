import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock3,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../app/providers";
import { Button } from "./ui";
import { useTableRows } from "./CrudPage";
import { localISODate } from "../lib/format";
import { useQueryClient } from "@tanstack/react-query";

export function FocusTimerModal({
  open,
  onClose,
  timerState,
  onUpdateState,
}: {
  open: boolean;
  onClose: () => void;
  timerState: {
    isRunning: boolean;
    timeLeft: number;
    initialDuration: number;
    mode: "focus25" | "focus50" | "break5";
    subjectId: string;
    notes: string;
  };
  onUpdateState: React.Dispatch<
    React.SetStateAction<{
      isRunning: boolean;
      timeLeft: number;
      initialDuration: number;
      mode: "focus25" | "focus50" | "break5";
      subjectId: string;
      notes: string;
    }>
  >;
}) {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();
  const subjects = useTableRows("subjects");
  const students = useTableRows("students");

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  const subjectList = subjects.data ?? [];
  const currentStudent = students.data?.[0];

  const { isRunning, timeLeft, initialDuration, mode, subjectId, notes } = timerState;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = Math.max(0, Math.min(1, 1 - timeLeft / initialDuration));
  const strokeDashoffset = 283 * (1 - progress);

  function setMode(newMode: "focus25" | "focus50" | "break5") {
    let dur = 25 * 60;
    if (newMode === "focus50") dur = 50 * 60;
    if (newMode === "break5") dur = 5 * 60;

    onUpdateState((prev) => ({
      ...prev,
      mode: newMode,
      initialDuration: dur,
      timeLeft: dur,
      isRunning: false,
    }));
  }

  function togglePlay() {
    onUpdateState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }

  function resetTimer() {
    onUpdateState((prev) => ({
      ...prev,
      isRunning: false,
      timeLeft: prev.initialDuration,
    }));
  }

  async function logSessionToPostgres() {
    if (!client || !user || !currentStudent) {
      setSaveError("Please ensure you are signed in and a student profile exists.");
      return;
    }
    const targetSubjectId = subjectId || subjectList[0]?.id;
    if (!targetSubjectId) {
      setSaveError("Please select a subject to log this session.");
      return;
    }

    setSaving(true);
    setSaveNotice("");
    setSaveError("");

    const elapsedSeconds = initialDuration - timeLeft;
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    const now = new Date();
    const endH = String(now.getHours()).padStart(2, "0");
    const endM = String(now.getMinutes()).padStart(2, "0");
    const startObj = new Date(now.getTime() - durationMins * 60000);
    const startH = String(startObj.getHours()).padStart(2, "0");
    const startM = String(startObj.getMinutes()).padStart(2, "0");

    try {
      const { error } = await client.from("study_sessions").insert({
        owner_id: user.id,
        student_id: currentStudent.id,
        subject_id: targetSubjectId,
        study_date: localISODate(now),
        start_time: `${startH}:${startM}:00`,
        end_time: `${endH}:${endM}:00`,
        duration_minutes: durationMins,
        status: "Completed",
        notes: notes || "Logged from StudyTrack Focus Timer",
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["table", user.id, "study_sessions"] });
      setSaveNotice(
        `Logged ${durationMins} minutes of completed focus time directly to Study Planner!`
      );
      resetTimer();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to record focus session.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-modal ring-1 ring-slate-900/10 text-center"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Flame className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-ink">
              Focus Study Timer
            </span>
          </div>
          <button
            aria-label="Close timer"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 active:scale-95 transition-all"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Tabs */}
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-900/5">
            {[
              { id: "focus25", label: "25m Focus" },
              { id: "focus50", label: "50m Deep" },
              { id: "break5", label: "5m Break" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id as "focus25" | "focus50" | "break5")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === t.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Radial Countdown Clock */}
          <div className="relative mx-auto h-48 w-48">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={mode === "break5" ? "#10b981" : "#4f46e5"}
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                {timeFormatted}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={resetTimer}
              title="Reset"
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-button hover:bg-indigo-700 active:scale-95 transition-all"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Start Focus</span>
                </>
              )}
            </button>
          </div>

          {/* Subject Allocation & Notes */}
          <div className="space-y-3 text-left border-t border-slate-100 pt-4">
            <div>
              <label className="field-label" htmlFor="focus-subject">
                Assign Study Subject
              </label>
              <select
                id="focus-subject"
                className="field-control text-xs"
                value={subjectId}
                onChange={(e) =>
                  onUpdateState((prev) => ({ ...prev, subjectId: e.target.value }))
                }
              >
                {subjectList.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.code)} · {String(s.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="text"
                className="field-control text-xs"
                placeholder="What are you focusing on? (e.g. BST balancing, SQL joins)"
                value={notes}
                onChange={(e) =>
                  onUpdateState((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {saveNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 text-left">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 text-left">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Auto-syncs with Study Planner
          </span>
          <Button
            size="sm"
            onClick={logSessionToPostgres}
            disabled={saving || timeLeft === initialDuration}
          >
            <Sparkles className="h-3.5 w-3.5 -ml-0.5" />
            {saving ? "Saving…" : "Save to Planner"}
          </Button>
        </div>
      </section>
    </div>
  );
}
