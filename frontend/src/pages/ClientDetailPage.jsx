import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getClientById } from "../api/clientApi";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { formatDate } from "../utils/date";

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getClientById(id)
      .then((data) => setClient(data))
      .catch((fetchError) => setError(fetchError.message));
  }, [id]);

  if (error) {
    return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  }

  if (!client) {
    return <p className="text-sm text-slate-500">Loading client details...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-black">{client.companyName}</h1>
        <p className="mt-1 text-slate-500">{client.name}</p>
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
          <p className="sm:col-span-2 lg:col-span-3">
            <span className="font-semibold">Address:</span> {client.address}
          </p>
          <p className="sm:col-span-2 lg:col-span-3">
            <span className="font-semibold">Notes:</span> {client.notes || "-"}
          </p>
        </div>
      </div>

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
    </div>
  );
}
