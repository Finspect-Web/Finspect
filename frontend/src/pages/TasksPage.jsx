import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageTransition from "../components/PageTransition";
import { getClients } from "../api/clientApi";
import { createTask, deleteTask, getTasks, updateTask } from "../api/taskApi";
import { getUsers } from "../api/userApi";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDate, isToday } from "../utils/date";

const emptyTaskForm = {
  title: "",
  description: "",
  assignedToId: "",
  clientId: "",
  dueDate: "",
  priority: "MEDIUM"
};

export default function TasksPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("UPCOMING");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyTaskForm);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = [getTasks(), getClients()];
      if (isAdmin) {
        promises.push(getUsers());
      }
      const [taskData, clientData, userData] = await Promise.all(promises);
      setTasks(taskData);
      setClients(clientData);
      if (userData) {
        setUsers(userData);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [loadData, isAuthenticated]);

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.client.companyName.toLowerCase().includes(query) ||
        task.assignedTo.name.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (filter === "TODAY") return isToday(task.dueDate) && task.status === "PENDING";
      if (filter === "UPCOMING") return !isToday(task.dueDate) && task.status === "PENDING";
      if (filter === "COMPLETED") return task.status === "COMPLETED";
      return true;
    });
  }, [tasks, search, filter]);

  const submitTask = async (event) => {
    event.preventDefault();
    try {
      await createTask(form);
      setForm(emptyTaskForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await updateTask(taskId, { status });
      await loadData();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(taskId);
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <PageTransition className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Tasks</h1>
        <div className="flex flex-wrap gap-2">
          {["TODAY", "UPCOMING", "COMPLETED"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                filter === value
                  ? "bg-brand-900 text-white"
                  : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search tasks by title/client/assignee..."
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
      />

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {isAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Assign New Task</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitTask}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Due Date</span>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Description</span>
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Client</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Assign To</span>
              <select
                value={form.assignedToId}
                onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Select staff</option>
                {users.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Priority</span>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="w-full rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                Assign Task
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading tasks...</p> : null}
        {filteredTasks.map((task) => (
          <article
            key={task.id}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-white">{task.title}</span>
                <span className="hidden sm:inline"> • {task.client.companyName}</span>
                <span className="hidden sm:inline"> • {task.assignedTo?.name || "-"}</span>
                <span> • {formatDate(task.dueDate)}</span>
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            </div>
            {task.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => updateStatus(task.id, "COMPLETED")}
                className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Mark Completed
              </button>
            ) : null}
          </article>
        ))}
        {filteredTasks.length === 0 && !loading ? <p className="text-sm text-slate-500">No tasks found.</p> : null}
      </section>
    </PageTransition>
  );
}
