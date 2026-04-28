const acronymMap = {
  gstin: "GSTIN",
  pan: "PAN",
  id: "ID",
  otp: "OTP",
  api: "API"
};

export function formatFieldLabel(value) {
  if (!value) return "";

  const normalized = value
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  return normalized
    .split(/\s+/)
    .map((word) => {
      const lowered = word.toLowerCase();
      if (acronymMap[lowered]) return acronymMap[lowered];
      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(" ");
}
