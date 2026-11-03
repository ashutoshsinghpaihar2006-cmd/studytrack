import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useAuth, useRuntimeConnection } from "./providers";
import { AppShell } from "./AppShell";
import { AuthPage, SupabaseSetupPage } from "./AuthPage";
import { LoadingState } from "../components/ui";

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const StudentsPage = lazy(() => import("../features/students/StudentsPage").then((module) => ({ default: module.StudentsPage })));
const StudentProfilePage = lazy(() => import("../features/students/StudentsPage").then((module) => ({ default: module.StudentProfilePage })));
const SubjectsPage = lazy(() => import("../features/subjects/SubjectsPage").then((module) => ({ default: module.SubjectsPage })));
const TopicsPage = lazy(() => import("../features/topics/TopicsPage").then((module) => ({ default: module.TopicsPage })));
const AttendancePage = lazy(() => import("../features/attendance/AttendancePage").then((module) => ({ default: module.AttendancePage })));
const AssignmentsPage = lazy(() => import("../features/assignments/AssignmentsPage").then((module) => ({ default: module.AssignmentsPage })));
const ExaminationsPage = lazy(() => import("../features/examinations/ExaminationsPage").then((module) => ({ default: module.ExaminationsPage })));
const MarksPage = lazy(() => import("../features/marks/MarksPage").then((module) => ({ default: module.MarksPage })));
const PlannerPage = lazy(() => import("../features/planner/PlannerPage").then((module) => ({ default: module.PlannerPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

function RouteGate({ children }: { children: React.ReactNode }) {
  const connection = useRuntimeConnection();
  const { user, loading: authLoading } = useAuth();
  if (connection.loading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Connecting to your workspace…" /></div>;
  if (!connection.client) return <SupabaseSetupPage error={connection.error} />;
  if (authLoading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Checking your sign-in…" /></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  const connection = useRuntimeConnection();
  if (connection.loading) return <div className="grid min-h-screen place-items-center"><LoadingState label="Preparing your academic workspace…" /></div>;
  if (!connection.client) return <SupabaseSetupPage error={connection.error} />;
  return <Suspense fallback={<div className="grid min-h-[55vh] place-items-center"><LoadingState label="Opening your workspace…" /></div>}><Routes>
    <Route path="/login" element={<PublicRoute><AuthPage mode="login" /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><AuthPage mode="register" /></PublicRoute>} />
    <Route path="/" element={<RouteGate><AppShell /></RouteGate>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="students/:id" element={<StudentProfilePage />} />
      <Route path="subjects" element={<SubjectsPage />} />
      <Route path="topics" element={<TopicsPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="assignments" element={<AssignmentsPage />} />
      <Route path="examinations" element={<ExaminationsPage />} />
      <Route path="marks" element={<MarksPage />} />
      <Route path="planner" element={<PlannerPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></Suspense>;
}

export function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
