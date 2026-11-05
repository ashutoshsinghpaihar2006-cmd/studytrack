import type { SupabaseClient } from "@supabase/supabase-js";
import { localISODate } from "./format";

export type TimetableSlot = {
  id: string;
  owner_id?: string;
  day_of_week: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  subject_id: string;
  student_id?: string | null;
  start_time: string; // "09:00"
  end_time: string; // "10:15"
  room?: string | null;
  auto_log: boolean;
  created_at?: string;
};

export const DAYS_OF_WEEK = [
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
  { id: 6, name: "Saturday", short: "Sat" },
  { id: 0, name: "Sunday", short: "Sun" },
];

const STORAGE_KEY_PREFIX = "studytrack_timetable_slots_";

export function getLocalTimetableSlots(userId: string): TimetableSlot[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalTimetableSlots(userId: string, slots: TimetableSlot[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(slots));
  } catch {}
}

export function generateDefaultTimetable(
  userId: string,
  subjects: Array<{ id: string; name: string; code: string }>,
  studentId?: string
): TimetableSlot[] {
  if (!subjects.length) return [];

  const ds = subjects.find((s) => /data|cs201/i.test(s.name + s.code)) ?? subjects[0];
  const math = subjects.find((s) => /discrete|math|ma203/i.test(s.name + s.code)) ?? subjects[1] ?? subjects[0];
  const db = subjects.find((s) => /database|dbms|cs301/i.test(s.name + s.code)) ?? subjects[2] ?? subjects[0];
  const os = subjects.find((s) => /operating|os|cs303/i.test(s.name + s.code)) ?? subjects[3] ?? subjects[0];

  return [
    // Monday
    {
      id: "slot-mon-1",
      owner_id: userId,
      day_of_week: 1,
      subject_id: ds.id,
      student_id: studentId,
      start_time: "09:00",
      end_time: "10:15",
      room: "Room 301",
      auto_log: false,
    },
    {
      id: "slot-mon-2",
      owner_id: userId,
      day_of_week: 1,
      subject_id: math.id,
      student_id: studentId,
      start_time: "11:00",
      end_time: "12:15",
      room: "Lecture Hall B",
      auto_log: false,
    },
    // Tuesday
    {
      id: "slot-tue-1",
      owner_id: userId,
      day_of_week: 2,
      subject_id: db.id,
      student_id: studentId,
      start_time: "10:00",
      end_time: "11:15",
      room: "Computer Lab 2",
      auto_log: true,
    },
    {
      id: "slot-tue-2",
      owner_id: userId,
      day_of_week: 2,
      subject_id: os.id,
      student_id: studentId,
      start_time: "14:00",
      end_time: "15:15",
      room: "Hall A",
      auto_log: false,
    },
    // Wednesday
    {
      id: "slot-wed-1",
      owner_id: userId,
      day_of_week: 3,
      subject_id: ds.id,
      student_id: studentId,
      start_time: "09:00",
      end_time: "10:15",
      room: "Room 301",
      auto_log: false,
    },
    {
      id: "slot-wed-2",
      owner_id: userId,
      day_of_week: 3,
      subject_id: os.id,
      student_id: studentId,
      start_time: "11:30",
      end_time: "12:45",
      room: "Systems Lab 1",
      auto_log: true,
    },
    // Thursday
    {
      id: "slot-thu-1",
      owner_id: userId,
      day_of_week: 4,
      subject_id: db.id,
      student_id: studentId,
      start_time: "10:00",
      end_time: "11:15",
      room: "Computer Lab 2",
      auto_log: true,
    },
    {
      id: "slot-thu-2",
      owner_id: userId,
      day_of_week: 4,
      subject_id: math.id,
      student_id: studentId,
      start_time: "14:00",
      end_time: "15:15",
      room: "Lecture Hall B",
      auto_log: false,
    },
    // Friday
    {
      id: "slot-fri-1",
      owner_id: userId,
      day_of_week: 5,
      subject_id: os.id,
      student_id: studentId,
      start_time: "09:30",
      end_time: "10:45",
      room: "Hall A",
      auto_log: false,
    },
    {
      id: "slot-fri-2",
      owner_id: userId,
      day_of_week: 5,
      subject_id: db.id,
      student_id: studentId,
      start_time: "11:15",
      end_time: "12:30",
      room: "Seminar Room 102",
      auto_log: false,
    },
  ];
}

/**
 * Fetch slots from Supabase table if available, falling back to account local store.
 */
export async function loadTimetableSlots(
  client: SupabaseClient | null,
  userId: string,
  subjects: Array<{ id: string; name: string; code: string }>,
  studentId?: string
): Promise<TimetableSlot[]> {
  if (client) {
    try {
      const { data, error } = await client
        .from("timetable_slots")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as TimetableSlot[];
      }
    } catch {}
  }

  // Check local store
  const local = getLocalTimetableSlots(userId);
  if (local.length > 0) return local;

  // Generate sensible defaults
  const defaults = generateDefaultTimetable(userId, subjects, studentId);
  saveLocalTimetableSlots(userId, defaults);
  return defaults;
}

export type ClassStatus = "in_session" | "just_ended" | "upcoming" | "past";

export type TodayClassNotification = {
  slot: TimetableSlot;
  status: ClassStatus;
  subjectName: string;
  subjectCode: string;
  isLogged: boolean;
  loggedStatus?: "Present" | "Absent" | "Late";
  attendanceRecordId?: string;
  minutesUntilStart?: number;
  minutesSinceEnd?: number;
};

/**
 * Calculates current active, recent, or upcoming class status for today
 */
export function getTodayClassNotifications(
  slots: TimetableSlot[],
  subjects: Array<{ id: string; name: string; code: string }>,
  todayAttendance: Array<{ id: string; subject_id: string; status: string; attendance_date: string }>,
  now: Date = new Date()
): TodayClassNotification[] {
  const currentDayOfWeek = now.getDay(); // 0-6
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySlots = slots.filter((slot) => slot.day_of_week === currentDayOfWeek);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const notifications: TodayClassNotification[] = [];

  for (const slot of todaySlots) {
    const subject = subjectMap.get(slot.subject_id);
    if (!subject) continue;

    const [startH, startM] = slot.start_time.split(":").map(Number);
    const [endH, endM] = slot.end_time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if attendance already recorded today for this subject
    const existing = todayAttendance.find(
      (a) => a.subject_id === slot.subject_id && a.attendance_date === localISODate(now)
    );

    let status: ClassStatus;
    let minutesUntilStart = 0;
    let minutesSinceEnd = 0;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      status = "in_session";
    } else if (currentMinutes > endMinutes && currentMinutes <= endMinutes + 180) {
      // Just ended in the last 3 hours
      status = "just_ended";
      minutesSinceEnd = currentMinutes - endMinutes;
    } else if (currentMinutes < startMinutes && currentMinutes >= startMinutes - 60) {
      // Starting within the next hour
      status = "upcoming";
      minutesUntilStart = startMinutes - currentMinutes;
    } else if (currentMinutes > endMinutes) {
      status = "past";
      minutesSinceEnd = currentMinutes - endMinutes;
    } else {
      status = "upcoming";
      minutesUntilStart = startMinutes - currentMinutes;
    }

    notifications.push({
      slot,
      status,
      subjectName: subject.name,
      subjectCode: subject.code,
      isLogged: Boolean(existing),
      loggedStatus: existing?.status as "Present" | "Absent" | "Late" | undefined,
      attendanceRecordId: existing?.id,
      minutesUntilStart,
      minutesSinceEnd,
    });
  }

  return notifications;
}
