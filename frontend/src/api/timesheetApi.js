import api from "./axios";

export async function getTimesheetEntries(params) {
  const response = await api.get("/api/timesheets", { params });
  return response.data.data;
}

export async function createTimesheetEntry(payload) {
  const response = await api.post("/api/timesheets", payload);
  return response.data.data;
}

export async function updateTimesheetEntry(id, payload) {
  const response = await api.put(`/api/timesheets/${id}`, payload);
  return response.data.data;
}

export async function deleteTimesheetEntry(id) {
  await api.delete(`/api/timesheets/${id}`);
}
