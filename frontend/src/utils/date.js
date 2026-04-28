export function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatDateTime(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function isToday(dateValue) {
  const today = new Date();
  const date = new Date(dateValue);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
