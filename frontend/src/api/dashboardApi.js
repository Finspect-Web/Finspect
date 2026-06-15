import api from "./axios";

export async function getDashboardSummary() {
  const response = await api.get("/api/dashboard/summary");
  return response.data.data;
}

export async function getActivityLogs() {
  const response = await api.get("/api/dashboard/activity");
  return response.data.data;
}

export async function getStaffMonitoring() {
  const response = await api.get("/api/dashboard/staff-monitoring");
  return response.data.data;
}
