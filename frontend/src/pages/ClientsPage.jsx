import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createClient, deleteClient, getClients, updateClient } from "../api/clientApi";
import { useAuth } from "../hooks/useAuth";
import { formatFieldLabel } from "../utils/text";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
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
  const [openForm, setOpenForm] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [form, setForm] = useState(initialForm);

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
      gstin: client.gstin || "",
      pan: client.pan || "",
      address: client.address || "",
      notes: client.notes || ""
    });
    setOpenForm(true);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      if (currentClient) {
        await updateClient(currentClient.id, form);
      } else {
        await createClient(form);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-soft dark:bg-slate-900">
            <h2 className="text-xl font-bold">{currentClient ? "Edit Client" : "Add Client"}</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
              {Object.entries(form).map(([key, value]) => (
                <label key={key} className={key === "address" || key === "notes" ? "sm:col-span-2" : ""}>
                  <span className="mb-1 block text-sm font-semibold text-slate-600">{formatFieldLabel(key)}</span>
                  <input
                    required={["name", "email", "phone", "companyName", "address"].includes(key)}
                    value={value}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              ))}
              <div className="sm:col-span-2 flex justify-end gap-2">
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
