import { useEffect, useState } from "react";
import PageTransition from "../components/PageTransition";
import { getActivityLogs, getStaffMonitoring } from "../api/dashboardApi";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime } from "../utils/date";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [staffMonitoring, setStaffMonitoring] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const calls = [getActivityLogs()];
    if (user.role === "ADMIN") {
      calls.push(getStaffMonitoring());
    }

    Promise.all(calls)
      .then(([activityData, staffData]) => {
        setActivity(activityData);
        if (staffData) setStaffMonitoring(staffData);
      })
      .catch((fetchError) => setError(fetchError.message));
  }, [user.role]);

  return (
    <PageTransition className="space-y-5">
      <h1 className="text-xl font-black">Reports & Monitoring</h1>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {user.role === "ADMIN" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Employee Monitoring</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-2 py-2 text-left">Employee</th>
                  <th className="px-2 py-2 text-left">Pending</th>
                  <th className="px-2 py-2 text-left">Completed</th>
                  <th className="px-2 py-2 text-left">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {staffMonitoring.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </td>
                    <td className="px-2 py-2">{member.pendingTasks}</td>
                    <td className="px-2 py-2">{member.completedTasks}</td>
                    <td className="px-2 py-2">{formatDateTime(member.lastActivityAt)}</td>
                  </tr>
                ))}
                {staffMonitoring.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-slate-500">
                      No staff records.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Activity Logs</h2>
        <div className="mt-4 space-y-2">
          {activity.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{entry.action.replaceAll("_", " ")}</p>
                <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
              </div>
              <p className="text-sm text-slate-500">{entry.performedBy.name}</p>
            </article>
          ))}
          {activity.length === 0 ? <p className="text-sm text-slate-500">No activity logs found.</p> : null}
        </div>
      </section>
    </PageTransition>
  );
}
