export default function TaskStageBadge({ stage }) {
  if (!stage) return <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs">No Stage</span>;

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: stage.color || "#4c2ca7", borderColor: stage.color || "#4c2ca7" }}
    >
      {stage.name}
    </span>
  );
}
