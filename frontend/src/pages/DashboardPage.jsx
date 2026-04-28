import { useEffect, useState } from "react";
import { getActivityLogs, getDashboardSummary } from "../api/dashboardApi";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import { formatDate } from "../utils/date";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDashboardSummary(), getActivityLogs()])
      .then(([summaryData, activityData]) => {
        setSummary(summaryData);
        setActivity(activityData.slice(0, 5));
      })
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  if (error) {
    return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  }

  if (!summary) {
    return <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Welcome back! Here&apos;s what&apos;s happening with your practice today.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Tasks" value={summary.stats.totalTasks} subtitle="All tasks in your workspace" />
        <StatCard title="Completed Tasks" value={summary.stats.completedTasks} subtitle="Finished tasks" />
        <StatCard title="Pending Tasks" value={summary.stats.pendingTasks} subtitle="Open tasks to action" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft xl:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Upcoming / Pending Tasks</h2>
          <div className="space-y-3">
            {summary.upcomingTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming tasks.</p>
            ) : (
              summary.upcomingTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{task.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{task.client.companyName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Assigned: {task.assignedTo.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Due: {formatDate(task.dueDate)}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Completed Tasks</h2>
          <div className="space-y-3">
            {summary.recentCompletedTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No completed tasks yet.</p>
            ) : (
              summary.recentCompletedTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-bold">{task.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{task.client.companyName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Due: {formatDate(task.dueDate)}</p>
                    <StatusBadge value={task.status} />
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            activity.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div>
                  <p className="font-semibold">{entry.action.replaceAll("_", " ")}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{entry.performedBy.name}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.createdAt)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
