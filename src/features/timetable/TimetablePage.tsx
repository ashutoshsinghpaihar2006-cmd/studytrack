import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Clock,
  DoorOpen,
  GraduationCap,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../app/providers";
import { Button, EmptyState, InlineError, LoadingState, PageHeader, Panel, SuccessNote } from "../../components/ui";
import { DAYS_OF_WEEK, type TimetableSlot } from "../../lib/timetable";
import { useTableRows } from "../../components/CrudPage";

export function TimetablePage() {
  const { client, user, role, logActivity } = useAuth();
  const queryClient = useQueryClient();

  const [activeDay, setActiveDay] = useState<number>(1); // Monday default
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit = role === "admin" || role === "professor";

  const subjectsQuery = useTableRows("subjects");
  const subjects = subjectsQuery.data ?? [];

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable_slots"],
    enabled: Boolean(client && user),
    queryFn: async () => {
      if (!client) return [];
      try {
        const { data, error: err } = await client
          .from("timetable_slots")
          .select("*")
          .order("start_time", { ascending: true });
        if (err) throw err;
        return (data ?? []) as TimetableSlot[];
      } catch (e) {
        console.warn("Could not query timetable_slots:", e);
        return [];
      }
    },
  });

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id as string, s]));
  }, [subjects]);

  const addSlotMutation = useMutation({
    mutationFn: async () => {
      if (!client || !user) return;
      if (!subjectId) throw new Error("Please select a subject.");
      if (endTime <= startTime) throw new Error("End time must be after start time.");

      const newSlot = {
        owner_id: user.id,
        day_of_week: activeDay,
        subject_id: subjectId,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || null,
        auto_log: false,
      };

      const { data, error: err } = await client.from("timetable_slots").insert(newSlot).select().single();
      if (err) throw err;

      const subName = (subjectMap.get(subjectId)?.name as string) ?? "Subject";
      await logActivity("Added timetable slot", "timetable_slots", data?.id, `${subName} on Day ${activeDay} at ${startTime}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable_slots"] });
      setModalOpen(false);
      setRoom("");
      setSuccess("Timetable session added.");
      setError("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to add timetable slot.");
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) return;
      const { error: err } = await client.from("timetable_slots").delete().eq("id", id);
      if (err) throw err;
      await logActivity("Removed timetable slot", "timetable_slots", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable_slots"] });
      setSuccess("Timetable slot removed.");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to delete slot.");
    },
  });

  const daySlots = useMemo(() => {
    return slots.filter((s) => s.day_of_week === activeDay);
  }, [slots, activeDay]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Academic Schedule"
          title="Class Timetable"
          description="Weekly recurring lecture periods, laboratory slots, and classroom venues."
        />
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Class Slot
          </Button>
        )}
      </div>

      {error && <InlineError message={error} />}
      {success && <SuccessNote message={success} />}

      {/* Day Selector Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-3">
        {DAYS_OF_WEEK.map((d) => {
          const count = slots.filter((s) => s.day_of_week === d.id).length;
          const isActive = activeDay === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setActiveDay(d.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{d.name}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Cards */}
      <Panel
        title={`${DAYS_OF_WEEK.find((d) => d.id === activeDay)?.name}'s Schedule`}
        description={
          daySlots.length === 0
            ? "No scheduled lectures or labs for this day."
            : `${daySlots.length} lecture period${daySlots.length > 1 ? "s" : ""} scheduled.`
        }
      >
        {isLoading ? (
          <div className="p-12">
            <LoadingState label="Loading timetable slots..." />
          </div>
        ) : daySlots.length === 0 ? (
          <EmptyState
            title="Free Day"
            message={`No lecture slots are scheduled for ${
              DAYS_OF_WEEK.find((d) => d.id === activeDay)?.name
            }.`}
          />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {daySlots.map((slot) => {
              const sub = subjectMap.get(slot.subject_id);
              const subName = (sub?.name as string) ?? "Subject";
              const subCode = (sub?.code as string) ?? "—";
              const faculty = (sub?.faculty as string) ?? null;

              return (
                <div
                  key={slot.id}
                  className="relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {subCode}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => deleteSlotMutation.mutate(slot.id)}
                        className="rounded-lg p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-ink">{subName}</h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono font-medium text-ink">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                    </div>

                    {slot.room && (
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                        <span>Room {slot.room}</span>
                      </div>
                    )}

                    {faculty && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        <span>{faculty}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Add Slot Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-ink">Add Timetable Slot</h3>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSlotMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="field-label">Subject</label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="field-control"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id as string} value={s.id as string}>
                      {String(s.code)} - {String(s.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Day of Week</label>
                <select
                  value={activeDay}
                  onChange={(e) => setActiveDay(Number(e.target.value))}
                  className="field-control"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="field-control"
                  />
                </div>
                <div>
                  <label className="field-label">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="field-control"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Lecture Hall / Room (Optional)</label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Hall 302, Lab 4"
                  className="field-control"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addSlotMutation.isPending}>
                  {addSlotMutation.isPending ? "Adding..." : "Add to Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
