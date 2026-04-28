import api from "./axios";

export async function getDashboardSummary() {
  const response = await api.get("/dashboard/summary");
  return response.data.data;
}

export async function getActivityLogs() {
  const response = await api.get("/dashboard/activity");
  return response.data.data;
}

export async function getStaffMonitoring() {
  const response = await api.get("/dashboard/staff-monitoring");
  return response.data.data;
}
