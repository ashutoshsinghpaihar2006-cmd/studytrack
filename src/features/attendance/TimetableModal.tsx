import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/ui";
import { DAYS_OF_WEEK, type TimetableSlot } from "../../lib/timetable";

export function TimetableModal({
  open,
  onClose,
  onSave,
  subjects,
  studentId,
  editingSlot,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (slot: Omit<TimetableSlot, "id"> & { id?: string }) => void;
  subjects: Array<{ id: string; name: string; code: string }>;
  studentId?: string;
  editingSlot?: TimetableSlot | null;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:15");
  const [room, setRoom] = useState("");
  const [autoLog, setAutoLog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingSlot) {
      setDayOfWeek(editingSlot.day_of_week);
      setSubjectId(editingSlot.subject_id);
      setStartTime(editingSlot.start_time);
      setEndTime(editingSlot.end_time);
      setRoom(editingSlot.room ?? "");
      setAutoLog(editingSlot.auto_log);
      setError("");
    } else {
      setDayOfWeek(1);
      setSubjectId(subjects[0]?.id ?? "");
      setStartTime("09:00");
      setEndTime("10:15");
      setRoom("");
      setAutoLog(false);
      setError("");
    }
  }, [editingSlot, open, subjects]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }

    onSave({
      id: editingSlot?.id,
      day_of_week: dayOfWeek,
      subject_id: subjectId,
      student_id: studentId,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || null,
      auto_log: autoLog,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink">
              {editingSlot ? "Edit Class Slot" : "Add Timetable Class Slot"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure scheduled lecture hours and auto-attendance options.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 active:scale-95 transition-all"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="field-label" htmlFor="day-of-week">
              Day of Week
            </label>
            <select
              id="day-of-week"
              className="field-control"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="subject-id">
              Subject / Course
            </label>
            <select
              id="subject-id"
              className="field-control"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="start-time">
                Start Time
              </label>
              <input
                id="start-time"
                type="time"
                required
                className="field-control"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="end-time">
                End Time
              </label>
              <input
                id="end-time"
                type="time"
                required
                className="field-control"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="room">
              Room / Venue (optional)
            </label>
            <input
              id="room"
              type="text"
              className="field-control"
              placeholder="e.g. Room 301, Lab 2, Hall B"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoLog}
                onChange={(e) => setAutoLog(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-indigo-900">
                  Automatic Attendance Logging
                </span>
                <p className="mt-0.5 text-indigo-700/80 leading-relaxed">
                  Automatically mark attendance as &quot;Present&quot; in PostgreSQL when this class concludes if not previously logged.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSlot ? "Update Slot" : "Add to Timetable"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
