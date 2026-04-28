import api from "./axios";

export async function getTimesheetEntries(params) {
  const response = await api.get("/timesheets", { params });
  return response.data.data;
}

export async function createTimesheetEntry(payload) {
  const response = await api.post("/timesheets", payload);
  return response.data.data;
}

export async function updateTimesheetEntry(id, payload) {
  const response = await api.put(`/timesheets/${id}`, payload);
  return response.data.data;
}

export async function deleteTimesheetEntry(id) {
  await api.delete(`/timesheets/${id}`);
}
