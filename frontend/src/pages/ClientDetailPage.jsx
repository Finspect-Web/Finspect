import { Copy, Download, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { createCredential, deleteCredential, getCredentialPassword, getCredentials, updateCredential } from "../api/credentialApi";
import { createDocument, getDocuments } from "../api/documentApi";
import { getClientById } from "../api/clientApi";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/date";

const credentialInitialForm = {
  type: "GST Portal",
  customType: "",
  username: "",
  password: "",
  notes: ""
};

const documentInitialForm = {
  title: "",
  category: "OTHER",
  customCategory: "",
  description: ""
};

const credentialTypes = ["GST Portal", "Email", "Banking", "Accounting", "Other"];
const documentCategories = ["KYC", "TAX", "LEGAL", "FINANCIAL", "COMPLIANCE", "OTHER"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function ClientDetailPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { id } = useParams();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [credentials, setCredentials] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [credentialError, setCredentialError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [activePasswordId, setActivePasswordId] = useState(null);
  const [credentialPasswords, setCredentialPasswords] = useState({});
  const [loadingPasswordId, setLoadingPasswordId] = useState(null);
  const [editingCredentialId, setEditingCredentialId] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [credentialForm, setCredentialForm] = useState(credentialInitialForm);
  const [documentForm, setDocumentForm] = useState(documentInitialForm);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const loadClient = async () => {
    const data = await getClientById(id);
    setClient(data);
  };

  const loadCredentials = async () => {
    const data = await getCredentials(id);
    setCredentials(data);
  };

  const loadDocuments = async () => {
    const data = await getDocuments(id);
    setDocuments(data);
  };

  useEffect(() => {
    setError("");
    setClient(null);
    loadClient()
      .then(() => setError(""))
      .catch((fetchError) => setError(fetchError.message));
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (["details", "passwords", "documents"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab !== "passwords") return;

    loadCredentials()
      .then(() => setCredentialError(""))
      .catch((fetchError) => {
        setCredentials([]);
        setCredentialError(fetchError.message);
      });
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "passwords") {
      setActivePasswordId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (credentials.length === 0) {
      setCredentialPasswords({});
      setActivePasswordId(null);
      return;
    }

    setCredentialPasswords((prev) => {
      const next = {};
      credentials.forEach((credential) => {
        if (prev[credential.id]) {
          next[credential.id] = prev[credential.id];
        }
      });
      return next;
    });
  }, [credentials]);

  useEffect(() => {
    if (activeTab !== "documents") return;

    loadDocuments()
      .then(() => setDocumentError(""))
      .catch((fetchError) => {
        setDocuments([]);
        setDocumentError(fetchError.message);
      });
  }, [activeTab, id]);

  const resetCredentialForm = () => {
    setCredentialForm(credentialInitialForm);
    setEditingCredentialId(null);
  };

  const openPasswordModal = () => {
    setEditingCredentialId(null);
    setCredentialForm(credentialInitialForm);
    setCredentialError("");
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    resetCredentialForm();
  };

  const resetDocumentForm = () => {
    setDocumentForm(documentInitialForm);
    setDocumentFile(null);
    setDocumentInputKey((current) => current + 1);
  };

  const openDocumentModal = () => {
    setDocumentError("");
    setIsDocumentModalOpen(true);
  };

  const closeDocumentModal = () => {
    setIsDocumentModalOpen(false);
    resetDocumentForm();
  };

  const submitCredential = async (event) => {
    event.preventDefault();

    try {
      const resolvedType =
        credentialForm.type === "Other" ? credentialForm.customType.trim() : credentialForm.type;
      if (credentialForm.type === "Other" && !resolvedType) {
        setCredentialError("Please enter a password type.");
        return;
      }

      const payload = {
        serviceName: resolvedType,
        username: credentialForm.username,
        notes: credentialForm.notes || undefined
      };

      if (credentialForm.password) {
        payload.password = credentialForm.password;
      }

      if (editingCredentialId) {
        await updateCredential(editingCredentialId, payload);
      } else {
        await createCredential({ ...payload, clientId: id, password: credentialForm.password });
      }

      closePasswordModal();
      const data = await getCredentials(id);
      setCredentials(data);
      setCredentialError("");
    } catch (submitError) {
      setCredentialError(submitError.message);
    }
  };

  const editCredential = (credential) => {
    const credentialType = credential.type || credential.serviceName || "GST Portal";
    const isCustomType = !credentialTypes.includes(credentialType);
    setEditingCredentialId(credential.id);
    setCredentialForm({
      type: isCustomType ? "Other" : credentialType,
      customType: isCustomType ? credentialType : "",
      username: credential.username,
      password: "",
      notes: credential.notes || ""
    });
    setCredentialError("");
    setIsPasswordModalOpen(true);
    setActiveTab("passwords");
  };

  const removeCredential = async (credentialId) => {
    if (!window.confirm("Delete this password?")) return;

    try {
      await deleteCredential(credentialId);
      const data = await getCredentials(id);
      setCredentials(data);
      setCredentialError("");
    } catch (deleteError) {
      setCredentialError(deleteError.message);
    }
  };

  const revealPassword = async (credentialId) => {
    setActivePasswordId(credentialId);
    if (credentialPasswords[credentialId]) return;

    try {
      setLoadingPasswordId(credentialId);
      const data = await getCredentialPassword(credentialId);
      setCredentialPasswords((prev) => ({ ...prev, [credentialId]: data.password }));
      setCredentialError("");
    } catch (revealError) {
      setCredentialError(revealError.message);
    } finally {
      setLoadingPasswordId(null);
    }
  };

  const hidePassword = (credentialId) => {
    setActivePasswordId((current) => (current === credentialId ? null : current));
  };

  const copyPassword = async (credentialId) => {
    const password = credentialPasswords[credentialId];
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCredentialError("");
    } catch (copyError) {
      setCredentialError(copyError.message || "Unable to copy password to clipboard.");
    }
  };

  const handleDocumentFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentFile(file);
    if (!documentForm.title) {
      setDocumentForm((prev) => ({ ...prev, title: file.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const submitDocument = async (event) => {
    event.preventDefault();

    const resolvedCategory =
      documentForm.category === "OTHER" ? documentForm.customCategory.trim() : documentForm.category;
    if (documentForm.category === "OTHER" && !resolvedCategory) {
      setDocumentError("Please enter a document type.");
      return;
    }

    if (!documentFile) {
      setDocumentError("Please choose a file first.");
      return;
    }

    try {
      setUploadingDocument(true);
      const fileUrl = await readFileAsDataUrl(documentFile);
      await createDocument({
        clientId: id,
        title: documentForm.title,
        category: resolvedCategory,
        description: documentForm.description || undefined,
        fileUrl
      });
      closeDocumentModal();
      const data = await getDocuments(id);
      setDocuments(data);
      setDocumentError("");
    } catch (uploadError) {
      setDocumentError(uploadError.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  if (error) {
    return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  }

  if (!client) {
    return <p className="text-sm text-slate-500">Loading client details...</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{client.companyName}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{client.name}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900 dark:bg-brand-900/30 dark:text-brand-100">
            Assigned Staff: {client.assignedTo?.name || "Unassigned"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "details", label: "Details" },
            { key: "passwords", label: "Passwords" },
            { key: "documents", label: "Documents" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-100"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "details" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Details</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span> {client.email}
            </p>
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Phone:</span> {client.phone}
            </p>
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-300">GSTIN:</span> {client.gstin || "-"}
            </p>
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-300">PAN:</span> {client.pan || "-"}
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span> {client.address}
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {client.notes || "-"}
            </p>
          </div>
        </section>
      ) : null}

      {activeTab === "passwords" ? (
        <section className="space-y-4">
          {credentialError ? <p className="text-sm font-semibold text-rose-600">{credentialError}</p> : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Passwords</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Stored passwords stay in a compact list.</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  + Add
                </button>
              ) : null}
            </div>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Password</th>
                  {isAdmin ? <th className="px-4 py-3">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {credentials.map((credential) => (
                  <tr key={credential.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{credential.type || credential.serviceName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{credential.username}</td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-2"
                        onMouseEnter={() => revealPassword(credential.id)}
                        onMouseLeave={() => hidePassword(credential.id)}
                      >
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {activePasswordId === credential.id && credentialPasswords[credential.id]
                            ? credentialPasswords[credential.id]
                            : credential.password}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPassword(credential.id)}
                          disabled={
                            activePasswordId !== credential.id ||
                            !credentialPasswords[credential.id] ||
                            loadingPasswordId === credential.id
                          }
                          title={credentialPasswords[credential.id] ? "Copy password" : "Loading password"}
                          className={`rounded-lg border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
                            activePasswordId === credential.id ? "visible" : "invisible"
                          }`}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
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
                      </td>
                    ) : null}
                  </tr>
                ))}
                {credentials.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-4 py-6 text-center text-slate-500">
                      No passwords found for this client.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
          </section>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="space-y-4">
          {documentError ? <p className="text-sm font-semibold text-rose-600">{documentError}</p> : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Documents</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload files, store the link, and keep them tied to this client.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-500">{documents.length} files</span>
                <button
                  type="button"
                  onClick={openDocumentModal}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  + Add
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {documents.map((document) => (
              <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{document.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {document.category} • Uploaded {formatDate(document.createdAt)}
                    </p>
                    {document.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{document.description}</p> : null}
                  </div>

                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Download size={14} />
                    View / Download
                  </a>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Uploaded by {document.uploadedBy?.name || "Unknown"}</p>
              </article>
            ))}
            {documents.length === 0 ? <p className="text-sm text-slate-500">No documents found for this client.</p> : null}
          </section>
        </section>
      ) : null}

      {isPasswordModalOpen ? (
        <Modal onClose={closePasswordModal}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCredentialId ? "Edit Password" : "Add Password"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep it simple and update only what matters.</p>
            </div>
            <button
              type="button"
              onClick={closePasswordModal}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={submitCredential}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Type</span>
              <select
                value={credentialForm.type}
                onChange={(event) =>
                  setCredentialForm((prev) => ({
                    ...prev,
                    type: event.target.value,
                    customType: event.target.value === "Other" ? prev.customType : ""
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {credentialTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {credentialForm.type === "Other" ? (
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Password type</span>
                <input
                  required
                  value={credentialForm.customType}
                  onChange={(event) => setCredentialForm((prev) => ({ ...prev, customType: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            ) : null}

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Username</span>
              <input
                required
                value={credentialForm.username}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                Password {editingCredentialId ? "(leave blank to keep current)" : ""}
              </span>
              <input
                required={!editingCredentialId}
                type="password"
                value={credentialForm.password}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Notes</span>
              <textarea
                rows="3"
                value={credentialForm.notes}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={closePasswordModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                {editingCredentialId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isDocumentModalOpen ? (
        <Modal onClose={closeDocumentModal}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Document</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Attach a file and keep the layout compact.</p>
            </div>
            <button
              type="button"
              onClick={closeDocumentModal}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={submitDocument}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Title</span>
              <input
                required
                value={documentForm.title}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Category</span>
              <select
                value={documentForm.category}
                onChange={(event) =>
                  setDocumentForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                    customCategory: event.target.value === "OTHER" ? prev.customCategory : ""
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {documentCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {documentForm.category === "OTHER" ? (
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Document Type</span>
                <input
                  required
                  value={documentForm.customCategory}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, customCategory: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            ) : null}

            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">File</span>
              <input
                key={documentInputKey}
                type="file"
                onChange={handleDocumentFile}
                className="block w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-900 file:px-3 file:py-2 file:text-white dark:border-slate-700 dark:text-slate-300"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">Description</span>
              <textarea
                rows="3"
                value={documentForm.description}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeDocumentModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingDocument}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Upload size={16} />
                {uploadingDocument ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
