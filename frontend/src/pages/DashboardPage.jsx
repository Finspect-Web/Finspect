import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

  const stagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Focus view: upcoming work and recently completed tasks.
        </p>
      </motion.div>

      <motion.section
        variants={fadeUp}
        className="grid min-h-[calc(100vh-15rem)] gap-6 xl:grid-cols-2"
      >
        <motion.div
          variants={fadeUp}
          className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">{task.title}</span>
                      <span className="hidden sm:inline"> • {task.client?.companyName || "-"}</span>
                      <span className="hidden sm:inline"> • {task.assignedTo?.name || "-"}</span>
                      <span> • {formatDate(task.dueDate)}</span>
                    </p>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <PriorityBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">{task.title}</span>
                      <span className="hidden sm:inline"> • {task.client?.companyName || "-"}</span>
                      <span className="hidden sm:inline"> • {task.assignedTo?.name || "-"}</span>
                      <span> • {formatDate(task.dueDate)}</span>
                    </p>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <PriorityBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
