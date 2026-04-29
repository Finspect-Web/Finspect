import { Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createCredential, deleteCredential, getCredentials, updateCredential } from "../api/credentialApi";
import { getClientById } from "../api/clientApi";
import { useAuth } from "../hooks/useAuth";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { formatFieldLabel } from "../utils/text";
import { formatDate } from "../utils/date";

const credentialInitialForm = {
  serviceName: "",
  username: "",
  password: "",
  notes: ""
};

export default function ClientDetailPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("");
  const [credentials, setCredentials] = useState([]);
  const [credentialError, setCredentialError] = useState("");
  const [editingCredentialId, setEditingCredentialId] = useState(null);
  const [credentialForm, setCredentialForm] = useState(credentialInitialForm);
  const [visibleMap, setVisibleMap] = useState({});

  useEffect(() => {
    getClientById(id)
      .then((data) => setClient(data))
      .catch((fetchError) => setError(fetchError.message));
  }, [id]);

  useEffect(() => {
    if (activeView !== "credentials") return;

    getCredentials(id)
      .then((data) => {
        setCredentials(data);
        setCredentialError("");
      })
      .catch((fetchError) => {
        setCredentials([]);
        setCredentialError(fetchError.message);
      });
  }, [activeView, id]);

  const resetCredentialForm = () => {
    setCredentialForm(credentialInitialForm);
    setEditingCredentialId(null);
  };

  const submitCredential = async (event) => {
    event.preventDefault();
    try {
      if (editingCredentialId) {
        await updateCredential(editingCredentialId, credentialForm);
      } else {
        await createCredential({ ...credentialForm, clientId: id });
      }
      resetCredentialForm();
      const data = await getCredentials(id);
      setCredentials(data);
      setCredentialError("");
    } catch (submitError) {
      setCredentialError(submitError.message);
    }
  };

  const editCredential = (credential) => {
    setEditingCredentialId(credential.id);
    setCredentialForm({
      serviceName: credential.serviceName,
      username: credential.username,
      password: credential.password,
      notes: credential.notes || ""
    });
  };

  const removeCredential = async (credentialId) => {
    if (!window.confirm("Delete this credential?")) return;
    try {
      await deleteCredential(credentialId);
      const data = await getCredentials(id);
      setCredentials(data);
      setCredentialError("");
    } catch (deleteError) {
      setCredentialError(deleteError.message);
    }
  };

  const copyToClipboard = async (value) => {
    await navigator.clipboard.writeText(value);
  };

  if (error) {
    return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  }

  if (!client) {
    return <p className="text-sm text-slate-500">Loading client details...</p>;
  }

  const viewOptions = [
    { key: "overview", label: "Overview" },
    { key: "tasks", label: `Tasks (${client.tasks.length})` },
    { key: "credentials", label: "Credentials & Passwords" },
    { key: "documents", label: "Documents" }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-black">{client.companyName}</h1>
        <p className="mt-1 text-slate-500">{client.name}</p>
        <p className="mt-3 text-sm text-slate-500">What do you want to display for this client?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {viewOptions.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                activeView === tab.key
                  ? "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-100"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!activeView ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600 shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Select a section above to open this client workspace.
        </section>
      ) : null}

      {activeView === "overview" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Client Information</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p>
              <span className="font-semibold">Email:</span> {client.email}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {client.phone}
            </p>
            <p>
              <span className="font-semibold">GSTIN:</span> {client.gstin || "-"}
            </p>
            <p>
              <span className="font-semibold">PAN:</span> {client.pan || "-"}
            </p>
            <p>
              <span className="font-semibold">Assigned To:</span> {client.assignedTo?.name || "-"}
            </p>
            <p className="sm:col-span-2 lg:col-span-3">
              <span className="font-semibold">Address:</span> {client.address}
            </p>
            <p className="sm:col-span-2 lg:col-span-3">
              <span className="font-semibold">Notes:</span> {client.notes || "-"}
            </p>
          </div>
        </section>
      ) : null}

      {activeView === "tasks" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Associated Tasks</h2>
          <div className="mt-4 space-y-3">
            {client.tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks for this client yet.</p>
            ) : (
              client.tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <div className="flex items-center gap-2">
                      <PriorityBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Due: {formatDate(task.dueDate)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeView === "credentials" ? (
        <section className="space-y-4">
          {credentialError ? (
            <div
              className={`rounded-2xl border p-4 text-sm font-medium ${
                isAdmin
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200"
              }`}
            >
              {credentialError}
            </div>
          ) : null}

          {isAdmin ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold">{editingCredentialId ? "Edit Credential" : "Add Credential"}</h2>
                <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitCredential}>
                  {Object.entries(credentialForm).map(([key, value]) => (
                    <label key={key} className={key === "notes" ? "md:col-span-2" : ""}>
                      <span className="mb-1 block text-sm font-semibold text-slate-600">{formatFieldLabel(key)}</span>
                      <input
                        required={["serviceName", "username", "password"].includes(key)}
                        value={value}
                        onChange={(event) => setCredentialForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="w-full"
                      />
                    </label>
                  ))}
                  <div className="md:col-span-2 flex justify-end gap-2">
                    {editingCredentialId ? (
                      <button type="button" onClick={resetCredentialForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                        Cancel
                      </button>
                    ) : null}
                    <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                      {editingCredentialId ? "Update" : "Save"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          ) : null}

          {!credentialError ? (
            <>
              <section className="grid gap-3 lg:grid-cols-2">
                {credentials.map((credential) => (
                  <article
                    key={credential.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{credential.serviceName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{credential.username}</p>
                      </div>
                      {isAdmin ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editCredential(credential)}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCredential(credential.id)}
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm font-semibold text-slate-600">Password</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="font-mono">
                          {visibleMap[credential.id] ? credential.password : "•".repeat(Math.max(credential.password.length, 8))}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setVisibleMap((prev) => ({ ...prev, [credential.id]: !prev[credential.id] }))}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
                          >
                            {visibleMap[credential.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(credential.password)}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{credential.notes || "No notes"}</p>
                  </article>
                ))}
                {credentials.length === 0 ? <p className="text-sm text-slate-500">No credentials found for this client.</p> : null}
              </section>
            </>
          ) : null}
        </section>
      ) : null}

      {activeView === "documents" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Documents</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Required Documents will be listed here. This feature is coming soon!
          </p>
        </section>
      ) : null}
    </div>
  );
}
