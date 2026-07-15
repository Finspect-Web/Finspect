import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createTaskStage, deleteTaskStage, getTaskStages, updateTaskStage } from "../api/taskStageApi";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../hooks/useAuth";

const emptyForm = {
  name: "",
  order: "",
  color: "#4c2ca7",
  isDefault: false
};

export default function TaskStagesPage() {
  const { user } = useAuth();
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const loadStages = async () => {
    try {
      const data = await getTaskStages();
      setStages(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      order: Number(form.order),
      color: form.color,
      isDefault: form.isDefault
    };

    try {
      if (editingId) {
        await updateTaskStage(editingId, payload);
      } else {
        await createTaskStage(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadStages();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onEdit = (stage) => {
    setEditingId(stage.id);
    setForm({
      name: stage.name,
      order: String(stage.order),
      color: stage.color || "#4c2ca7",
      isDefault: Boolean(stage.isDefault)
    });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const onDelete = (id) => setConfirmDeleteId(id);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteTaskStage(confirmDeleteId);
      setConfirmDeleteId(null);
      await loadStages();
    } catch (deleteError) {
      setError(deleteError.message);
      setConfirmDeleteId(null);
    }
  };

  if (user.role !== "ADMIN") {
    return <p className="text-sm text-slate-500">Task stage management is admin-only.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black">Task Stages</h1>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold">{editingId ? "Edit Stage" : "Create Stage"}</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Order</span>
            <input
              type="number"
              min="1"
              value={form.order}
              onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Color</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
              className="h-10 w-full"
            />
          </label>
          <label className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-600">Set as default stage</span>
          </label>
          <div className="md:col-span-2 flex items-end justify-end gap-2">
            {editingId ? (
              <button type="button" onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }} className="rounded-xl border border-slate-300 px-4 py-2">
                Cancel
              </button>
            ) : null}
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 font-semibold text-white">
              <Plus size={16} />
              {editingId ? "Update Stage" : "Create Stage"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Configured Stages</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-left">Order</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Color</th>
                <th className="px-2 py-2 text-left">Default</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-2">{stage.order}</td>
                  <td className="px-2 py-2 font-semibold">{stage.name}</td>
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.color}
                    </span>
                  </td>
                  <td className="px-2 py-2">{stage.isDefault ? "Yes" : "No"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(stage)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(stage.id)}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-slate-500">
                    No task stages found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Stage"
        message="Are you sure you want to delete this task stage? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
