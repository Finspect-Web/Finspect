import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getClients } from "../api/clientApi";
import { getTasks } from "../api/taskApi";
import { createTimesheetEntry, deleteTimesheetEntry, getTimesheetEntries, updateTimesheetEntry } from "../api/timesheetApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/date";

function monthStartISO() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return start.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  userId: "",
  clientId: "",
  taskId: "",
  workDate: todayISO(),
  durationMinutes: "",
  description: "",
  billable: true
};

export default function TimesheetsPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [filterUserId, setFilterUserId] = useState("");
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalEntries: 0, totalHours: 0, billableHours: 0 });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const calls = [getClients(), getTasks(), getTimesheetEntries({ from, to, userId: filterUserId || undefined })];
      if (isAdmin) calls.push(getUsers());
      const [clientData, taskData, timesheetData, userData] = await Promise.all(calls);
      setClients(clientData);
      setTasks(taskData);
      setEntries(timesheetData.entries);
      setSummary(timesheetData.summary);
      if (userData) {
        setUsers(userData);
        setFilterUserId((prev) => prev || "");
        setForm((prev) => ({
          ...prev,
          userId: prev.userId || userData[0]?.id || ""
        }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [filterUserId, from, isAdmin, to]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [loadData, isAuthenticated]);

  const resetForm = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...emptyForm,
      userId: isAdmin ? prev.userId : ""
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      clientId: form.clientId || null,
      taskId: form.taskId || null
    };

    try {
      if (editingId) {
        await updateTimesheetEntry(editingId, payload);
      } else {
        await createTimesheetEntry(payload);
      }
      resetForm();
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      userId: entry.user?.id || "",
      clientId: entry.client?.id || "",
      taskId: entry.task?.id || "",
      workDate: new Date(entry.workDate).toISOString().slice(0, 10),
      durationMinutes: String(entry.durationMinutes),
      description: entry.description,
      billable: Boolean(entry.billable)
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this timesheet entry?")) return;
    try {
      await deleteTimesheetEntry(id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black">Timesheets</h1>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Entries</p>
          <p className="text-xl font-bold">{summary.totalEntries}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total Hours</p>
          <p className="text-xl font-bold">{summary.totalHours}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Billable Hours</p>
          <p className="text-xl font-bold">{summary.billableHours}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold">{editingId ? "Edit Entry" : "Add Entry"}</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          {isAdmin ? (
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">User</span>
              <select
                required
                value={form.userId}
                onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
              >
                <option value="">Select user</option>
                {users.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Work Date</span>
            <input
              required
              type="date"
              value={form.workDate}
              onChange={(event) => setForm((prev) => ({ ...prev, workDate: event.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Duration (Minutes)</span>
            <input
              required
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Client (Optional)</span>
            <select
              value={form.clientId}
              onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
            >
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Task (Optional)</span>
            <select
              value={form.taskId}
              onChange={(event) => setForm((prev) => ({ ...prev, taskId: event.target.value }))}
            >
              <option value="">No task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(event) => setForm((prev) => ({ ...prev, billable: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-600">Billable Entry</span>
          </label>
          <label className="md:col-span-3">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Description</span>
            <input
              required
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-2">
                Cancel
              </button>
            ) : null}
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 font-semibold text-white">
              <Plus size={16} />
              {editingId ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Entries</h2>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            {isAdmin ? (
              <select value={filterUserId} onChange={(event) => setFilterUserId(event.target.value)}>
                <option value="">All users</option>
                {users.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-left">Date</th>
                {isAdmin ? <th className="px-2 py-2 text-left">User</th> : null}
                <th className="px-2 py-2 text-left">Client</th>
                <th className="px-2 py-2 text-left">Task</th>
                <th className="px-2 py-2 text-left">Duration</th>
                <th className="px-2 py-2 text-left">Billable</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-2">{formatDate(entry.workDate)}</td>
                  {isAdmin ? <td className="px-2 py-2">{entry.user?.name || "-"}</td> : null}
                  <td className="px-2 py-2">{entry.client?.companyName || "-"}</td>
                  <td className="px-2 py-2">{entry.task?.title || "-"}</td>
                  <td className="px-2 py-2">{entry.durationMinutes} min</td>
                  <td className="px-2 py-2">{entry.billable ? "Yes" : "No"}</td>
                  <td className="px-2 py-2">{entry.description}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-2 py-4 text-slate-500">
                    No timesheet entries found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
