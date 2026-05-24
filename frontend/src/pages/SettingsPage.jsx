import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { registerUser } from "../api/authApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import {
  getGoogleAuthUrl,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from "../api/googleCalendarApi";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUserForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Google Calendar state
  const [calendarStatus, setCalendarStatus] = useState({
    connected: false,
    email: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [gcError, setGcError] = useState("");
  const [gcSuccess, setGcSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    if (user.role !== "ADMIN") return;
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [user.role]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const status = await getGoogleCalendarStatus();
      setCalendarStatus(status);
    } catch {
      // Not connected yet — ignore
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadCalendarStatus();
  }, [loadUsers, loadCalendarStatus]);

  // Handle OAuth callback query params
  useEffect(() => {
    const gcParam = searchParams.get("googleCalendar");
    if (gcParam === "connected") {
      setGcSuccess("Google Calendar connected successfully!");
      loadCalendarStatus();
    } else if (gcParam === "error") {
      setGcError(searchParams.get("message") || "Failed to connect Google Calendar.");
    }
  }, [searchParams, loadCalendarStatus]);

  const onCreateUser = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    try {
      await registerUser(form);
      setSuccessMessage("User created successfully.");
      setForm(emptyUserForm);
      await loadUsers();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      setGcError("");
      const authUrl = await getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (connectError) {
      setGcError(connectError.message);
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm("Disconnect Google Calendar? Events will no longer sync.")) return;
    try {
      setDisconnecting(true);
      await disconnectGoogleCalendar();
      setCalendarStatus({ connected: false, email: null });
      setGcSuccess("Google Calendar disconnected.");
    } catch (err) {
      setGcError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <PageTransition className="space-y-5">
      <h1 className="text-xl font-black">Settings</h1>

      {/* Profile Section */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="text-xl font-bold">Profile</h2>
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="font-semibold">Name:</span> {user.name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-semibold">Role:</span> {user.role}
          </p>
        </div>
      </motion.section>

      {/* Google Calendar Integration */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Google Calendar Integration</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Connect your Google Calendar to automatically sync tasks and compliance events.
              Assigned staff receive calendar invites and reminders.
            </p>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              calendarStatus.connected
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                calendarStatus.connected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {calendarStatus.connected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {gcError ? (
          <p className="mt-3 text-sm font-semibold text-rose-600">{gcError}</p>
        ) : null}
        {gcSuccess ? (
          <p className="mt-3 text-sm font-semibold text-emerald-600">{gcSuccess}</p>
        ) : null}

        {calendarStatus.connected ? (
          <div className="mt-4 space-y-3">
            {/* Connected info */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800">
                <Check size={16} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Google Calendar Connected
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {calendarStatus.email
                    ? `Syncing with ${calendarStatus.email}`
                    : "Calendar sync is active"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnectGoogle}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              {disconnecting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              When connected, assigning a task or compliance item will automatically:
            </p>
            <ul className="mb-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check size={12} className="text-brand-500" />
                Create a Google Calendar event
              </li>
              <li className="flex items-center gap-2">
                <Check size={12} className="text-brand-500" />
                Send calendar invites to assigned staff
              </li>
              <li className="flex items-center gap-2">
                <Check size={12} className="text-brand-500" />
                Set automatic email &amp; popup reminders
              </li>
              <li className="flex items-center gap-2">
                <Check size={12} className="text-brand-500" />
                Support recurring compliance events (GST, TDS, etc.)
              </li>
            </ul>
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              Connect Google Calendar
            </button>
          </div>
        )}
      </motion.section>

      {/* Admin: Manage Staff */}
      {user.role === "ADMIN" ? (
        <>
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold">Manage Staff</h2>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Password</span>
                <input
                  required
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                  Create User
                </button>
              </div>
            </form>
            {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
            {successMessage ? <p className="mt-2 text-sm font-semibold text-emerald-600">{successMessage}</p> : null}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold">Users</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left">Name</th>
                    <th className="px-2 py-2 text-left">Email</th>
                    <th className="px-2 py-2 text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2">{member.name}</td>
                      <td className="px-2 py-2">{member.email}</td>
                      <td className="px-2 py-2">{member.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Staff users can view profile settings here. User management is admin-only.
        </p>
      )}
    </PageTransition>
  );
}
