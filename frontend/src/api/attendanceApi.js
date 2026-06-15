import api from "./axios";

export async function checkInAttendance() {
  const response = await api.post("/api/attendance/check-in");
  return response.data.data;
}

export async function checkOutAttendance() {
  const response = await api.post("/api/attendance/check-out");
  return response.data.data;
}

export async function getAttendanceToday() {
  const response = await api.get("/api/attendance/today");
  return response.data.data;
}

export async function getAttendanceList(params) {
  const response = await api.get("/api/attendance", { params });
  return response.data.data;
}

export async function markAttendance(payload) {
  const response = await api.post("/api/attendance/mark", payload);
  return response.data.data;
}
