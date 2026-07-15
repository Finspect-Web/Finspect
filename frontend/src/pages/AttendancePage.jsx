import { useCallback, useEffect, useState } from "react";
import PageTransition from "../components/PageTransition";
import { checkInAttendance, checkOutAttendance, getAttendanceList, getAttendanceToday, markAttendance } from "../api/attendanceApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateTime } from "../utils/date";

function minutesLabel(value) {
  const minutes = Number(value || 0);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m`;
}

function monthStartISO() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return start.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [today, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [error, setError] = useState("");
  const [markForm, setMarkForm] = useState({
    userId: "",
    date: todayISO(),
    status: "PRESENT",
    checkInAt: "",
    checkOutAt: "",
    notes: ""
  });

  const loadData = useCallback(async () => {
    try {
      const calls = [getAttendanceToday(), getAttendanceList({ from, to })];
      if (isAdmin) calls.push(getUsers());
      const [todayData, listData, userData] = await Promise.all(calls);
      setToday(todayData);
      setRecords(listData);
      if (userData) {
        setUsers(userData);
        setMarkForm((prev) => ({
          ...prev,
          userId: prev.userId || userData[0]?.id || ""
        }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [from, isAdmin, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onCheckIn = async () => {
    setError("");
    try {
      await checkInAttendance();
      await loadData();
    } catch (checkInError) {
      setError(checkInError.message);
    }
  };

  const onCheckOut = async () => {
    setError("");
    try {
      await checkOutAttendance();
      await loadData();
    } catch (checkOutError) {
      setError(checkOutError.message);
    }
  };

  const onMarkAttendance = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await markAttendance({
        ...markForm,
        checkInAt: markForm.checkInAt || null,
        checkOutAt: markForm.checkOutAt || null
      });
      await loadData();
    } catch (markError) {
      setError(markError.message);
    }
  };

  return (
    <PageTransition className="space-y-5">
      <h1 className="text-xl font-black">Attendance</h1>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Today</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <p className="text-sm">
            <span className="font-semibold">Status:</span> {today?.status || "Not marked"}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Check In:</span> {formatDateTime(today?.checkInAt)}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Check Out:</span> {formatDateTime(today?.checkOutAt)}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Worked:</span> {minutesLabel(today?.workedMinutes)}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onCheckIn} className="rounded-xl bg-brand-900 px-4 py-2 font-semibold text-white">
            Check In
          </button>
          <button type="button" onClick={onCheckOut} className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white">
            Check Out
          </button>
        </div>
      </section>

      {isAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold">Mark Attendance (Admin)</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onMarkAttendance}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">User</span>
              <select
                value={markForm.userId}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, userId: event.target.value }))}
              >
                <option value="">Select user</option>
                {users.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Date</span>
              <input
                type="date"
                value={markForm.date}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Status</span>
              <select
                value={markForm.status}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="HALF_DAY">HALF_DAY</option>
                <option value="ABSENT">ABSENT</option>
                <option value="LEAVE">LEAVE</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Check In (Optional)</span>
              <input
                type="datetime-local"
                value={markForm.checkInAt}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, checkInAt: event.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Check Out (Optional)</span>
              <input
                type="datetime-local"
                value={markForm.checkOutAt}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, checkOutAt: event.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Notes</span>
              <input
                value={markForm.notes}
                onChange={(event) => setMarkForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 font-semibold text-white">
                Save Attendance
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Attendance History</h2>
          <div className="flex gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-left">Date</th>
                {isAdmin ? <th className="px-2 py-2 text-left">User</th> : null}
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Check In</th>
                <th className="px-2 py-2 text-left">Check Out</th>
                <th className="px-2 py-2 text-left">Worked</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-2">{formatDate(item.date)}</td>
                  {isAdmin ? <td className="px-2 py-2">{item.user?.name || "-"}</td> : null}
                  <td className="px-2 py-2">{item.status}</td>
                  <td className="px-2 py-2">{formatDateTime(item.checkInAt)}</td>
                  <td className="px-2 py-2">{formatDateTime(item.checkOutAt)}</td>
                  <td className="px-2 py-2">{minutesLabel(item.workedMinutes)}</td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-2 py-4 text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </PageTransition>
  );
}
