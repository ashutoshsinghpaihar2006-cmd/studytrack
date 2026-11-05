import type { SupabaseClient } from "@supabase/supabase-js";
import { localISODate } from "./format";

export type GoogleClassroomCourse = {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  alternateLink?: string;
};

export type GoogleClassroomAssignment = {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  maxPoints: number;
  alternateLink?: string;
  state: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "MISSING";
  assignedMarks?: number | null;
  studyTrackStatus: "Submitted" | "Pending" | "Overdue";
  matchedSubjectId?: string;
  isSynced?: boolean;
};

export type GoogleClassroomState = {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  connectedAt: string | null;
  courses: GoogleClassroomCourse[];
  assignments: GoogleClassroomAssignment[];
};

const CLASSROOM_STORAGE_KEY = "studytrack_gclassroom_state";

export function getStoredClassroomState(): GoogleClassroomState {
  try {
    const raw = localStorage.getItem(CLASSROOM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    isConnected: false,
    userEmail: null,
    userName: null,
    connectedAt: null,
    courses: [],
    assignments: [],
  };
}

export function saveStoredClassroomState(state: GoogleClassroomState): void {
  try {
    localStorage.setItem(CLASSROOM_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function generateRealisticClassroomData(
  userEmail: string,
  subjects: Array<{ id: string; name: string; code: string }>
): GoogleClassroomState {
  const ds = subjects.find((s) => /data|cs201/i.test(s.name + s.code)) ?? subjects[0];
  const math = subjects.find((s) => /discrete|math|ma203/i.test(s.name + s.code)) ?? subjects[1] ?? subjects[0];
  const db = subjects.find((s) => /database|dbms|cs301/i.test(s.name + s.code)) ?? subjects[2] ?? subjects[0];
  const os = subjects.find((s) => /operating|os|cs303/i.test(s.name + s.code)) ?? subjects[3] ?? subjects[0];

  const now = new Date();
  const pastDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return localISODate(date);
  };
  const futureDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return localISODate(date);
  };

  const courses: GoogleClassroomCourse[] = [
    {
      id: "gc-course-1",
      name: "CS201 Data Structures & Algorithms",
      section: "Section 4A",
      descriptionHeading: "Spring 2026",
      room: "Hall 301",
    },
    {
      id: "gc-course-2",
      name: "CS301 Database Management Systems",
      section: "Section 4A",
      descriptionHeading: "Spring 2026",
      room: "Lab 2",
    },
    {
      id: "gc-course-3",
      name: "CS303 Operating Systems Internals",
      section: "Section 4A",
      descriptionHeading: "Spring 2026",
      room: "Hall A",
    },
    {
      id: "gc-course-4",
      name: "MA203 Discrete Mathematics",
      section: "Section 4A",
      descriptionHeading: "Spring 2026",
      room: "Hall B",
    },
  ];

  const assignments: GoogleClassroomAssignment[] = [
    {
      id: "gc-asg-1",
      courseId: "gc-course-1",
      courseName: "CS201 Data Structures & Algorithms",
      title: "Binary Search Tree Lab Assignment",
      description: "Implement recursive insert, search, traversal, and balance factor calculation in C++.",
      assignedDate: pastDays(12),
      dueDate: futureDays(3),
      maxPoints: 25,
      state: "ASSIGNED",
      assignedMarks: null,
      studyTrackStatus: "Pending",
      matchedSubjectId: ds?.id,
    },
    {
      id: "gc-asg-2",
      courseId: "gc-course-1",
      courseName: "CS201 Data Structures & Algorithms",
      title: "AVL Tree Rotations Problem Set",
      description: "Draw the step-by-step tree transformations for the provided sequence of insertions.",
      assignedDate: pastDays(18),
      dueDate: pastDays(5),
      maxPoints: 20,
      state: "TURNED_IN",
      assignedMarks: 19,
      studyTrackStatus: "Submitted",
      matchedSubjectId: ds?.id,
    },
    {
      id: "gc-asg-3",
      courseId: "gc-course-2",
      courseName: "CS301 Database Management Systems",
      title: "SQL Joins and Group By Queries",
      description: "Write and test queries on the company sales schema using aggregate functions.",
      assignedDate: pastDays(14),
      dueDate: pastDays(2),
      maxPoints: 30,
      state: "MISSING",
      assignedMarks: null,
      studyTrackStatus: "Overdue",
      matchedSubjectId: db?.id,
    },
    {
      id: "gc-asg-4",
      courseId: "gc-course-2",
      courseName: "CS301 Database Management Systems",
      title: "BCNF & 3NF Normalization Decomposition",
      description: "Given functional dependencies, decompose the relation to BCNF and check for dependency preservation.",
      assignedDate: pastDays(7),
      dueDate: futureDays(6),
      maxPoints: 20,
      state: "ASSIGNED",
      assignedMarks: null,
      studyTrackStatus: "Pending",
      matchedSubjectId: db?.id,
    },
    {
      id: "gc-asg-5",
      courseId: "gc-course-3",
      courseName: "CS303 Operating Systems Internals",
      title: "Deadlock Avoidance Simulation (Banker's Algorithm)",
      description: "Implement Banker's algorithm and verify safe state transitions for 5 processes and 3 resources.",
      assignedDate: pastDays(22),
      dueDate: pastDays(8),
      maxPoints: 25,
      state: "RETURNED",
      assignedMarks: 23,
      studyTrackStatus: "Submitted",
      matchedSubjectId: os?.id,
    },
    {
      id: "gc-asg-6",
      courseId: "gc-course-4",
      courseName: "MA203 Discrete Mathematics",
      title: "Euler & Hamiltonian Paths Proof Worksheet",
      description: "Prove the necessary conditions for Eulerian circuits in connected graphs.",
      assignedDate: pastDays(10),
      dueDate: futureDays(4),
      maxPoints: 20,
      state: "ASSIGNED",
      assignedMarks: null,
      studyTrackStatus: "Pending",
      matchedSubjectId: math?.id,
    },
  ];

  return {
    isConnected: true,
    userEmail,
    userName: userEmail.split("@")[0],
    connectedAt: new Date().toISOString(),
    courses,
    assignments,
  };
}

/**
 * Sync selected Google Classroom assignments directly into PostgreSQL `public.assignments`
 */
export async function syncClassroomAssignmentsToPostgres(
  client: SupabaseClient,
  userId: string,
  assignments: GoogleClassroomAssignment[],
  existingStudyTrackAssignments: Array<{ id: string; title: string; subject_id: string }>
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  for (const asg of assignments) {
    if (!asg.matchedSubjectId) continue;

    const existing = existingStudyTrackAssignments.find(
      (item) =>
        item.title.toLowerCase().trim() === asg.title.toLowerCase().trim() ||
        (item.subject_id === asg.matchedSubjectId && item.title.includes(asg.title.slice(0, 15)))
    );

    const payload = {
      owner_id: userId,
      subject_id: asg.matchedSubjectId,
      title: asg.title,
      description: asg.description ?? "Imported from Google Classroom",
      assigned_date: asg.assignedDate,
      submission_deadline: asg.dueDate,
      status: asg.studyTrackStatus,
      marks_obtained: asg.assignedMarks ?? null,
      maximum_marks: asg.maxPoints,
    };

    if (existing) {
      const { error } = await client.from("assignments").update(payload).eq("id", existing.id);
      if (!error) updated++;
    } else {
      const { error } = await client.from("assignments").insert(payload);
      if (!error) added++;
    }
  }

  return { added, updated };
}
