import { Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getClients } from "../api/clientApi";
import { createCredential, deleteCredential, getCredentials, updateCredential } from "../api/credentialApi";
import { formatFieldLabel } from "../utils/text";

const emptyForm = {
  serviceName: "",
  username: "",
  password: "",
  notes: ""
};

export default function CredentialsPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [visibleMap, setVisibleMap] = useState({});

  useEffect(() => {
    getClients()
      .then((data) => {
        setClients(data);
        if (data[0]) {
          setClientId(data[0].id);
        }
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const loadCredentials = async (id) => {
    if (!id) return;
    try {
      const data = await getCredentials(id);
      setCredentials(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadCredentials(clientId);
  }, [clientId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await updateCredential(editingId, form);
      } else {
        await createCredential({ ...form, clientId });
      }
      resetForm();
      await loadCredentials(clientId);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onEdit = (item) => {
    setEditingId(item.id);
    setForm({
      serviceName: item.serviceName,
      username: item.username,
      password: item.password,
      notes: item.notes || ""
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this credential?")) return;
    try {
      await deleteCredential(id);
      await loadCredentials(clientId);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const onCopy = async (value) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black">Credential Vault</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Admin-only encrypted credentials. Use show/hide and copy safely.
      </p>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <label className="block max-w-sm">
        <span className="mb-1 block text-sm font-semibold text-slate-600">Client</span>
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </select>
      </label>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold">{editingId ? "Edit Credential" : "Add Credential"}</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitForm}>
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className={key === "notes" ? "md:col-span-2" : ""}>
              <span className="mb-1 block text-sm font-semibold text-slate-600">{formatFieldLabel(key)}</span>
              <input
                required={["serviceName", "username", "password"].includes(key)}
                value={value}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          ))}
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
            ) : null}
            <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {credentials.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{item.serviceName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.username}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-600">Password</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-mono">
                  {visibleMap[item.id] ? item.password : "•".repeat(Math.max(item.password.length, 8))}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
                  >
                    {visibleMap[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopy(item.password)}
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.notes || "No notes"}</p>
          </article>
        ))}
        {credentials.length === 0 ? <p className="text-sm text-slate-500">No credentials found.</p> : null}
      </section>
    </div>
  );
}
