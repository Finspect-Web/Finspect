export default function StatCard({ title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </article>
  );
}
