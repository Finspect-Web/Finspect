import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./hooks/useAuth";
import BillingPage from "./pages/BillingPage";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import CompliancePage from "./pages/CompliancePage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import LoginPage from "./pages/LoginPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import TasksPage from "./pages/TasksPage";
import TimesheetsPage from "./pages/TimesheetsPage";

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="rounded-2xl bg-white p-8 text-center shadow-soft dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Page not found</h1>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/timesheets" element={<TimesheetsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/credentials" element={<Navigate to="/clients" replace />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
