import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClients } from "../api/clientApi";
import { createCompliance, deleteCompliance, getComplianceTypes, getCompliances, updateCompliance } from "../api/complianceApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/date";

const defaultTypeOptions = [
  { value: "GST", label: "GST" },
  { value: "TDS", label: "TDS" },
  { value: "ROC", label: "ROC" },
  { value: "INCOME_TAX", label: "Income Tax" },
  { value: "OTHER", label: "Other" }
];

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

function normalizeTypeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function buildTypeOptions(types) {
  const map = new Map(defaultTypeOptions.map((option) => [normalizeTypeKey(option.value), option]));

  for (const type of types) {
    const name = String(type?.name || "").trim();
    if (!name) continue;
    const key = normalizeTypeKey(name);
    if (!map.has(key)) {
      map.set(key, { value: name, label: name });
    }
  }

  return [...map.values()];
}

export default function CompliancePage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [typeOptions, setTypeOptions] = useState(defaultTypeOptions);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const typeDropdownRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [complianceData, clientData, complianceTypeData, userData] = await Promise.all([
        getCompliances(),
        getClients(),
        getComplianceTypes().catch(() => []),
        isAdmin ? getUsers() : Promise.resolve([])
      ]);
      const mergedTypeOptions = buildTypeOptions(complianceTypeData);
      setItems(complianceData);
      setClients(clientData);
      setTypeOptions(mergedTypeOptions);
      if (isAdmin) setUsers(userData);
      setForm((prev) => {
        const next = { ...prev };
        if (!next.clientId && clientData[0]) {
          next.clientId = clientData[0].id;
        }
        if (!next.assignedToId && userData[0]) {
          next.assignedToId = userData[0].id;
        }
        if (!mergedTypeOptions.some((option) => option.value === next.type)) {
          next.type = "OTHER";
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

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!typeDropdownRef.current?.contains(event.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const selectedTypeOption = useMemo(() => {
    return typeOptions.find((option) => option.value === form.type) || { value: form.type, label: form.type };
  }, [form.type, typeOptions]);

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
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Client</span>
              <select
                className="w-full"
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

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Assigned To</span>
              <select
                className="w-full"
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

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Title</span>
              <input
                className="w-full"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Due Date</span>
              <input
                className="w-full"
                required
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Type</span>
              <div className="relative" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-left text-base font-medium text-slate-800 outline-none transition hover:bg-white focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  aria-haspopup="listbox"
                  aria-expanded={isTypeDropdownOpen}
                >
                  <span>{selectedTypeOption.label}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform dark:text-slate-300 ${isTypeDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isTypeDropdownOpen ? (
                  <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <ul role="listbox" className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin">
                      {typeOptions.map((option) => {
                        const isSelected = option.value === form.type;
                        return (
                          <li key={option.value}>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, type: option.value }));
                                setIsTypeDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-base transition ${
                                isSelected
                                  ? "bg-brand-50 font-semibold text-brand-900 dark:bg-brand-900/30 dark:text-brand-100"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              }`}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <span>{option.label}</span>
                              {isSelected ? <Check size={16} /> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Recurrence</span>
              <select
                className="w-full"
                value={form.recurrence}
                onChange={(event) => setForm((prev) => ({ ...prev, recurrence: event.target.value }))}
              >
                <option value="NONE">None</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Description</span>
              <input
                className="w-full"
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
