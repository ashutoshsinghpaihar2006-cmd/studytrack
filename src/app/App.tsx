import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useAuth, useRuntimeConnection } from "./providers";
import { AppShell } from "./AppShell";
import { AuthPage, SupabaseSetupPage } from "./AuthPage";
import { LoadingState } from "../components/ui";
import type { UserRole } from "../lib/database.types";

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const UserManagementPage = lazy(() => import("../features/admin/UserManagementPage").then((m) => ({ default: m.UserManagementPage })));
const StudentsPage = lazy(() => import("../features/students/StudentsPage").then((m) => ({ default: m.StudentsPage })));
const StudentProfilePage = lazy(() => import("../features/students/StudentsPage").then((m) => ({ default: m.StudentProfilePage })));
const SubjectsPage = lazy(() => import("../features/subjects/SubjectsPage").then((m) => ({ default: m.SubjectsPage })));
const TopicsPage = lazy(() => import("../features/topics/TopicsPage").then((m) => ({ default: m.TopicsPage })));
const TimetablePage = lazy(() => import("../features/timetable/TimetablePage").then((m) => ({ default: m.TimetablePage })));
const AttendancePage = lazy(() => import("../features/attendance/AttendancePage").then((m) => ({ default: m.AttendancePage })));
const AssignmentsPage = lazy(() => import("../features/assignments/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })));
const ExaminationsPage = lazy(() => import("../features/examinations/ExaminationsPage").then((m) => ({ default: m.ExaminationsPage })));
const MarksPage = lazy(() => import("../features/marks/MarksPage").then((m) => ({ default: m.MarksPage })));
const PlannerPage = lazy(() => import("../features/planner/PlannerPage").then((m) => ({ default: m.PlannerPage })));
const AnnouncementsPage = lazy(() => import("../features/announcements/AnnouncementsPage").then((m) => ({ default: m.AnnouncementsPage })));
const ActivityLogPage = lazy(() => import("../features/activity/ActivityLogPage").then((m) => ({ default: m.ActivityLogPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function RouteGate({ children }: { children: React.ReactNode }) {
  const connection = useRuntimeConnection();
  const { user, loading: authLoading } = useAuth();
  if (connection.loading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Connecting to your workspace..." /></div>;
  if (!connection.client) return <SupabaseSetupPage error={connection.error} />;
  if (authLoading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Checking authentication credentials..." /></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { role } = useAuth();
  if (!roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  const connection = useRuntimeConnection();
  if (connection.loading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Preparing your academic workspace..." /></div>;
  if (!connection.client) return <SupabaseSetupPage error={connection.error} />;

  return (
    <Suspense fallback={<div className="grid min-h-[55vh] place-items-center"><LoadingState label="Opening your workspace..." /></div>}>
      <Routes>
        <Route path="/login" element={<PublicRoute><AuthPage mode="login" /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><AuthPage mode="register" /></PublicRoute>} />
        <Route path="/" element={<RouteGate><AppShell /></RouteGate>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admin/users" element={<RoleRoute roles={["admin"]}><UserManagementPage /></RoleRoute>} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentProfilePage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="topics" element={<TopicsPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="examinations" element={<ExaminationsPage />} />
          <Route path="marks" element={<MarksPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="activity-log" element={<RoleRoute roles={["admin"]}><ActivityLogPage /></RoleRoute>} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
