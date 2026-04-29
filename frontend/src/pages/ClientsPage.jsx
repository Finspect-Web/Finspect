import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createClient, deleteClient, getClients, updateClient } from "../api/clientApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatFieldLabel } from "../utils/text";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  assignedToId: "",
  gstin: "",
  pan: "",
  address: "",
  notes: ""
};

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showOpenHint, setShowOpenHint] = useState(true);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    getUsers()
      .then((data) => setUsers(data.filter((item) => item.role === "STAFF")))
      .catch((loadError) => setError(loadError.message));
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowOpenHint(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.companyName.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
    );
  }, [clients, search]);

  const staffOptions = useMemo(() => users, [users]);

  const openCreate = () => {
    setCurrentClient(null);
    setForm(initialForm);
    setOpenForm(true);
  };

  const openEdit = (client) => {
    setCurrentClient(client);
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      companyName: client.companyName || "",
      assignedToId: client.assignedToId || client.assignedTo?.id || "",
      gstin: client.gstin || "",
      pan: client.pan || "",
      address: client.address || "",
      notes: client.notes || ""
    });
    setOpenForm(true);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      assignedToId: form.assignedToId || null
    };

    try {
      if (currentClient) {
        await updateClient(currentClient.id, payload);
      } else {
        await createClient(payload);
      }
      setOpenForm(false);
      setCurrentClient(null);
      setForm(initialForm);
      await loadClients();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await deleteClient(id);
      await loadClients();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-4">
      {showOpenHint ? (
        <div className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft dark:border-brand-800/60 dark:bg-slate-900 dark:text-slate-200">
          Click on client name to display details.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Clients</h1>
        <div className="flex gap-2">
          <input
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Search clients..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {isAdmin ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={16} />
              Add Client
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link to={`/clients/${client.id}`} className="font-semibold text-brand-700 hover:underline">
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{client.companyName}</td>
                <td className="px-4 py-3">{client.email}</td>
                <td className="px-4 py-3">{client.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(client.id)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">View only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No clients found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-7 shadow-soft dark:bg-slate-900">
            <h2 className="text-xl font-bold">{currentClient ? "Edit Client" : "Add Client"}</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              {Object.entries(form).map(([key, value]) => {
                if (key === "assignedToId") {
                  return (
                    <label key={key}>
                      <span className="mb-1 block text-sm font-semibold text-slate-600">Assign To</span>
                      <select
                        value={value}
                        onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="">Unassigned</option>
                        {staffOptions.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label key={key} className={key === "address" || key === "notes" ? "sm:col-span-2" : ""}>
                    <span className="mb-1 block text-sm font-semibold text-slate-600">{formatFieldLabel(key)}</span>
                    <input
                      required={["name", "email", "phone", "companyName", "address"].includes(key)}
                      value={value}
                      onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                );
              })}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpenForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
