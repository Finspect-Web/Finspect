const styleMap = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200"
};

export default function PriorityBadge({ value }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${styleMap[value] || styleMap.MEDIUM}`}>
      {value}
    </span>
  );
}
