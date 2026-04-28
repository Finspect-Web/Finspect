import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClients } from "../api/clientApi";
import { createCompliance, deleteCompliance, getCompliances, updateCompliance } from "../api/complianceApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/date";

const emptyForm = {
  clientId: "",
  title: "",
  description: "",
  type: "OTHER",
  dueDate: "",
  recurrence: "NONE",
  assignedToId: ""
};

const statusStyle = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-300",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200"
};

export default function CompliancePage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      const calls = [getCompliances(), getClients()];
      if (isAdmin) calls.push(getUsers());
      const [complianceData, clientData, userData] = await Promise.all(calls);
      setItems(complianceData);
      setClients(clientData);
      if (userData) setUsers(userData);
      setForm((prev) => {
        const next = { ...prev };
        if (!next.clientId && clientData[0]) {
          next.clientId = clientData[0].id;
        }
        if (!next.assignedToId && userData?.[0]) {
          next.assignedToId = userData[0].id;
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatch = filter === "ALL" || item.status === filter;
      if (!statusMatch) return false;
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.client.companyName.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    });
  }, [items, filter, search]);

  const onCreate = async (event) => {
    event.preventDefault();
    try {
      await createCompliance(form);
      setForm(emptyForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onStatusChange = async (id, status) => {
    try {
      await updateCompliance(id, { status });
      await loadData();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this compliance item?")) return;
    try {
      await deleteCompliance(id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Compliance Calendar</h1>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search compliance..."
            className="w-56 px-3 py-2 text-sm"
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-40 px-3 py-2 text-sm">
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {isAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold">Create Compliance Task</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Client</span>
              <select
                required
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
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
              <span className="mb-1 block text-sm font-semibold text-slate-600">Assigned To</span>
              <select
                required
                value={form.assignedToId}
                onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
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
              <span className="mb-1 block text-sm font-semibold text-slate-600">Title</span>
              <input
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Due Date</span>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Type</span>
              <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
                <option value="GST">GST</option>
                <option value="TDS">TDS</option>
                <option value="ROC">ROC</option>
                <option value="INCOME_TAX">Income Tax</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600">Recurrence</span>
              <select
                value={form.recurrence}
                onChange={(event) => setForm((prev) => ({ ...prev, recurrence: event.target.value }))}
              >
                <option value="NONE">None</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Description</span>
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                Create
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold">{item.title}</p>
                <p className="text-sm text-slate-500">
                  {item.client.companyName} • {item.type} • Due {formatDate(item.dueDate)}
                </p>
                <p className="text-xs text-slate-500">Assigned: {item.assignedTo?.name || "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle[item.status]}`}>
                  {item.status}
                </span>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-600">{item.description || "-"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["PENDING", "IN_PROGRESS", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(item.id, status)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    item.status === status
                      ? "bg-brand-900 text-white"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </article>
        ))}

        {filtered.length === 0 ? <p className="text-sm text-slate-500">No compliance items found.</p> : null}
      </section>
    </div>
  );
}
