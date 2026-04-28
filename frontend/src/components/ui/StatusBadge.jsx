const styleMap = {
  COMPLETED: "bg-blue-600 text-white",
  PENDING: "bg-slate-200 text-slate-700"
};

export default function StatusBadge({ value }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleMap[value] || styleMap.PENDING}`}>
      {value}
    </span>
  );
}
