import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers";
import { useTableRows, CrudPage } from "../../components/CrudPage";
import { Button, MetricCard, Panel, StatusBadge } from "../../components/ui";
import { formatDate, percent, localISODate } from "../../lib/format";
import type { ColumnSpec, FieldSpec } from "../../lib/database.types";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Layers,
  Pencil,
  Plus,
  Radio,
  Sparkles,
  Trash2,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import {
  DAYS_OF_WEEK,
  loadTimetableSlots,
  saveLocalTimetableSlots,
  getTodayClassNotifications,
  type TimetableSlot,
  type TodayClassNotification,
} from "../../lib/timetable";
import { TimetableModal } from "./TimetableModal";

export function AttendancePage() {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();

  const students = useTableRows("students");
  const subjects = useTableRows("subjects");
  const attendance = useTableRows("attendance");
  const enrollments = useTableRows("student_subjects");

  const [activeTab, setActiveTab] = useState<"history" | "timetable">("history");
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const studentList = useMemo(
    () =>
      (students.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.full_name),
        code: String(row.student_code),
      })),
    [students.data]
  );
  const currentStudentId = studentList[0]?.id;

  const subjectList = useMemo(
    () =>
      (subjects.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        code: String(row.code),
      })),
    [subjects.data]
  );

  const studentOptions = useMemo(
    () => studentList.map((s) => ({ value: s.id, label: `${s.name} · ${s.code}` })),
    [studentList]
  );
  const subjectOptions = useMemo(
    () => subjectList.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` })),
    [subjectList]
  );
  const studentMap = useMemo(
    () => new Map(studentList.map((s) => [s.id, s.name])),
    [studentList]
  );
  const subjectMap = useMemo(
    () => new Map(subjectList.map((s) => [s.id, `${s.code} · ${s.name}`])),
    [subjectList]
  );

  // Load Timetable Slots
  useEffect(() => {
    if (!user) return;
    loadTimetableSlots(client, user.id, subjectList, currentStudentId).then(setTimetableSlots);
  }, [client, user, subjectList, currentStudentId]);

  const records = attendance.data ?? [];
  const todayStr = localISODate();

  const todayAttendance = useMemo(
    () =>
      records
        .filter((r) => String(r.attendance_date) === todayStr)
        .map((r) => ({
          id: String(r.id),
          subject_id: String(r.subject_id),
          status: String(r.status),
          attendance_date: String(r.attendance_date),
        })),
    [records, todayStr]
  );

  // Calculate live class notifications
  const todayNotifications = useMemo(
    () => getTodayClassNotifications(timetableSlots, subjectList, todayAttendance),
    [timetableSlots, subjectList, todayAttendance]
  );

  // Auto-log engine: if slot has auto_log enabled and class has ended, auto-log Present in PostgreSQL
  useEffect(() => {
    if (!client || !user || !currentStudentId) return;

    for (const notif of todayNotifications) {
      if (notif.slot.auto_log && !notif.isLogged && (notif.status === "just_ended" || notif.status === "past")) {
        // Automatically mark as Present
        void logAttendanceQuick(notif.slot.subject_id, "Present", true);
      }
    }
  }, [client, user, currentStudentId, todayNotifications]);

  async function logAttendanceQuick(subjectId: string, status: "Present" | "Absent" | "Late", isAuto = false) {
    if (!client || !user) return;
    const studentId = currentStudentId;
    if (!studentId) {
      setActionError("Please add a student profile before logging attendance.");
      return;
    }

    setActionError("");

    // Check if record exists for today
    const existing = records.find(
      (r) => r.subject_id === subjectId && String(r.attendance_date) === todayStr
    );

    try {
      if (existing) {
        const { error } = await client
          .from("attendance")
          .update({ status })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("attendance").insert({
          owner_id: user.id,
          student_id: studentId,
          subject_id: subjectId,
          attendance_date: todayStr,
          status,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["table", user.id, "attendance"] });
      setActionNotice(
        isAuto
          ? `Auto-logged attendance as ${status} based on scheduled timetable.`
          : `Marked ${status} for today. Record saved to PostgreSQL.`
      );
      window.setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record attendance.");
    }
  }

  function handleSaveTimetableSlot(slotData: Omit<TimetableSlot, "id"> & { id?: string }) {
    if (!user) return;
    const id = slotData.id ?? `slot-${Date.now()}`;
    const newSlot: TimetableSlot = { ...slotData, id, owner_id: user.id };

    setTimetableSlots((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      const next = [...filtered, newSlot].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      });
      saveLocalTimetableSlots(user.id, next);

      // Attempt to save to Supabase if table exists
      if (client) {
        void Promise.resolve(client.from("timetable_slots").upsert(newSlot)).catch(() => {});
      }

      return next;
    });

    setActionNotice("Timetable slot saved.");
    window.setTimeout(() => setActionNotice(""), 3000);
  }

  function handleDeleteTimetableSlot(slotId: string) {
    if (!user) return;
    if (!window.confirm("Remove this class slot from your timetable?")) return;

    setTimetableSlots((prev) => {
      const next = prev.filter((s) => s.id !== slotId);
      saveLocalTimetableSlots(user.id, next);

      if (client) {
        void Promise.resolve(client.from("timetable_slots").delete().eq("id", slotId)).catch(() => {});
      }

      return next;
    });
  }

  const attended = records.filter(
    (record) => record.status === "Present" || record.status === "Late"
  ).length;
  const overall = percent(attended, records.length);
  const grouped = subjectList
    .map((subject) => {
      const subjectRecords = records.filter((record) => record.subject_id === subject.id);
      const countAttended = subjectRecords.filter(
        (record) => record.status === "Present" || record.status === "Late"
      ).length;
      return {
        subject,
        total: subjectRecords.length,
        value: percent(countAttended, subjectRecords.length),
      };
    })
    .filter((entry) =>
      enrollments.data?.some((enrollment) => enrollment.subject_id === entry.subject.id)
    );

  const belowCount = grouped.filter((entry) => entry.total > 0 && entry.value < 75).length;

  const fields: FieldSpec[] = [
    { name: "student_id", label: "Student", kind: "select", required: true, options: studentOptions },
    {
      name: "subject_id",
      label: "Subject",
      kind: "select",
      required: true,
      options: subjectOptions,
      helper: "Student must be enrolled in this course.",
    },
    { name: "attendance_date", label: "Date", kind: "date", required: true },
    {
      name: "status",
      label: "Status",
      kind: "select",
      required: true,
      options: ["Present", "Absent", "Late"].map((value) => ({ value, label: value })),
    },
  ];

  const columns: ColumnSpec[] = [
    {
      key: "attendance_date",
      label: "Date",
      render: (row) => (
        <span className="tabular-nums font-medium text-slate-700">
          {formatDate(row.attendance_date)}
        </span>
      ),
    },
    {
      key: "student_id",
      label: "Student",
      render: (row) => (
        <span className="font-semibold text-ink">
          {String(studentMap.get(String(row.student_id)) ?? "Unavailable")}
        </span>
      ),
    },
    {
      key: "subject_id",
      label: "Course",
      render: (row) => (
        <span className="text-slate-600">
          {String(subjectMap.get(String(row.subject_id)) ?? "Unavailable")}
        </span>
      ),
    },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      {/* Header and View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Attendance &amp; Schedule</div>
          <h1 className="page-title">Lecture Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Timetable-based auto-checkins, live class notifications, and PostgreSQL history.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 ring-1 ring-slate-900/5">
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Attendance History
          </button>
          <button
            onClick={() => setActiveTab("timetable")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "timetable"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />
            <span>Weekly Timetable</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
          {actionError}
        </div>
      )}

      {/* ─── LIVE TIMETABLE NOTIFICATION BANNER ─── */}
      {todayNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Radio className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            <span>Today&apos;s Timetable Schedule</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todayNotifications.map((notif) => {
              const isSession = notif.status === "in_session";
              const isEnded = notif.status === "just_ended";

              return (
                <div
                  key={notif.slot.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isSession
                      ? "border-indigo-300 bg-gradient-to-br from-indigo-50/80 to-white ring-2 ring-indigo-400/20 shadow-sm"
                      : isEnded && !notif.isLogged
                      ? "border-amber-200 bg-amber-50/40 ring-1 ring-amber-400/20"
                      : "border-slate-200/80 bg-white shadow-subtle"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-sm">
                          {notif.subjectName}
                        </span>
                        {notif.slot.auto_log && (
                          <span
                            title="Auto-log enabled"
                            className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        {notif.slot.start_time} – {notif.slot.end_time}
                        {notif.slot.room && ` · ${notif.slot.room}`}
                      </div>
                    </div>

                    {isSession ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">
                        In Session Now
                      </span>
                    ) : isEnded ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Class Ended
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Upcoming Today
                      </span>
                    )}
                  </div>

                  {/* Attendance Confirmation State */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {notif.isLogged ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Logged:</span>
                        <StatusBadge value={notif.loggedStatus ?? "Present"} />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          {isSession ? "Did you attend?" : "Mark attendance:"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                            onClick={() => logAttendanceQuick(notif.slot.subject_id, "Present")}
                          >
                            Present
                          </button>
                          <button
                            className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 active:scale-95 transition-all"
                            onClick={() => logAttendanceQuick(notif.slot.subject_id, "Late")}
                          >
                            Late
                          </button>
                          <button
                            className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 hover:bg-rose-100 active:scale-95 transition-all"
                            onClick={() => logAttendanceQuick(notif.slot.subject_id, "Absent")}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 1: ATTENDANCE HISTORY & SUBJECT BREAKDOWN ─── */}
      {activeTab === "history" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Overall Attendance"
              value={`${overall}%`}
              detail={`${attended} present/late of ${records.length} logged classes`}
              icon={<CalendarCheck2 className="h-4 w-4" />}
              tone={overall < 75 && records.length ? "amber" : "green"}
            />
            <MetricCard
              label="Total Records"
              value={records.length}
              detail="Stored across registered subjects"
              icon={<UserRoundCheck className="h-4 w-4" />}
              tone="blue"
            />
            <MetricCard
              label="Below 75% Threshold"
              value={belowCount}
              detail="Courses requiring attendance attention"
              icon={<AlertTriangle className="h-4 w-4" />}
              tone={belowCount > 0 ? "amber" : "indigo"}
            />
          </div>

          <Panel
            title="Subject Attendance Breakdown"
            description="Late arrivals count as present. Courses falling below the institutional 75% requirement are flagged."
          >
            {grouped.length ? (
              <div className="divide-y divide-slate-100">
                {grouped.map(({ subject, total, value }) => (
                  <div
                    key={String(subject.id)}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-40 flex-1">
                      <div className="text-sm font-semibold text-ink">
                        {String(subject.name)}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {String(subject.code)} · {total} classes logged
                      </div>
                    </div>
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-900/5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          value < 75 ? "bg-rose-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <div
                      className={`w-14 text-right font-mono text-xs font-bold tabular-nums ${
                        total && value < 75 ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {total ? `${value}%` : "—"}
                    </div>
                    {total > 0 && value < 75 && <StatusBadge value="Below 75%" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                Enroll students into courses to view attendance distributions.
              </div>
            )}
          </Panel>

          <CrudPage
            title="Attendance History"
            eyebrow="Daily Tracking"
            description="Log and modify daily lecture attendance records by student and course."
            table="attendance"
            fields={fields}
            columns={columns}
            searchKeys={[]}
            emptyTitle="No attendance logged"
            emptyMessage="Select a student and course to record daily attendance."
            addLabel="Log attendance"
          />
        </>
      )}

      {/* ─── TAB 2: WEEKLY TIMETABLE GRID & AUTO-LOGGING ─── */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-ink">Weekly Class Schedule</h2>
              <p className="text-xs text-slate-500">
                Configure your lecture timetable. Automatic attendance logging occurs when lectures conclude.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingSlot(null);
                setTimetableModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 -ml-0.5" />
              Add Class Slot
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {DAYS_OF_WEEK.filter((d) => d.id >= 1 && d.id <= 5).map((day) => {
              const daySlots = timetableSlots
                .filter((s) => s.day_of_week === day.id)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const isToday = new Date().getDay() === day.id;

              return (
                <div
                  key={day.id}
                  className={`rounded-2xl border p-4 space-y-3 ${
                    isToday
                      ? "border-indigo-300 bg-indigo-50/20 ring-1 ring-indigo-400/20 shadow-subtle"
                      : "border-slate-200/80 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-sm text-ink">{day.name}</span>
                    {isToday && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        Today
                      </span>
                    )}
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No classes scheduled.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {daySlots.map((slot) => {
                        const subject = subjectList.find((s) => s.id === slot.subject_id);

                        return (
                          <div
                            key={slot.id}
                            className="group rounded-xl border border-slate-100 bg-white p-3 shadow-subtle hover:border-slate-200 hover:shadow-card transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-mono text-[11px] font-bold text-indigo-700">
                                {slot.start_time} – {slot.end_time}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  title="Edit slot"
                                  className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                  onClick={() => {
                                    setEditingSlot(slot);
                                    setTimetableModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  title="Delete slot"
                                  className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleDeleteTimetableSlot(slot.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-1 font-semibold text-xs text-ink">
                              {subject ? subject.name : "Subject"}
                            </div>

                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{slot.room ?? "Main Lecture"}</span>
                              {slot.auto_log && (
                                <span className="flex items-center gap-0.5 text-indigo-600 font-medium">
                                  <Zap className="h-2.5 w-2.5" />
                                  Auto-Log
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TimetableModal
        open={timetableModalOpen}
        onClose={() => setTimetableModalOpen(false)}
        onSave={handleSaveTimetableSlot}
        subjects={subjectList}
        studentId={currentStudentId}
        editingSlot={editingSlot}
      />
    </div>
  );
}
