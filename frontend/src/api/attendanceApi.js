import api from "./axios";

export async function checkInAttendance() {
  const response = await api.post("/attendance/check-in");
  return response.data.data;
}

export async function checkOutAttendance() {
  const response = await api.post("/attendance/check-out");
  return response.data.data;
}

export async function getAttendanceToday() {
  const response = await api.get("/attendance/today");
  return response.data.data;
}

export async function getAttendanceList(params) {
  const response = await api.get("/attendance", { params });
  return response.data.data;
}

export async function markAttendance(payload) {
  const response = await api.post("/attendance/mark", payload);
  return response.data.data;
}
