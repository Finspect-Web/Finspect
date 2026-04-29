import { useEffect, useState } from "react";
import { getDashboardSummary } from "../api/dashboardApi";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { formatDate } from "../utils/date";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch((fetchError) => setError(fetchError.message));
  }, []);

  if (error) {
    return <p className="text-base font-semibold text-rose-600">{error}</p>;
  }

  if (!summary) {
    return <p className="text-base font-medium text-slate-500 dark:text-slate-400">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Focus view: upcoming work and recently completed tasks.
        </p>
      </div>

      <section className="grid min-h-[calc(100vh-15rem)] gap-6 xl:grid-cols-2">
        <div className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Upcoming / Pending Tasks</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-900 dark:bg-brand-900/40 dark:text-brand-100">
              {summary.upcomingTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {summary.upcomingTasks.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-base text-slate-500">No upcoming tasks.</p>
              </div>
            ) : (
              summary.upcomingTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <p className="text-base">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Task:</span> {task.title}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Client:</span> {task.client.companyName}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Assigned to:</span> {task.assignedTo.name}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Due date:</span> {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Completed Tasks</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
              {summary.recentCompletedTasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {summary.recentCompletedTasks.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-base text-slate-500">No completed tasks yet.</p>
              </div>
            ) : (
              summary.recentCompletedTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <p className="text-base">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Task:</span> {task.title}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Client:</span> {task.client.companyName}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Assigned to:</span> {task.assignedTo.name}
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Due date:</span> {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <StatusBadge value={task.status} />
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
