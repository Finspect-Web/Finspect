import api from "./axios";

export async function getComplianceTypes() {
  const response = await api.get("/api/compliance-types");
  return response.data.data;
}

export async function getCompliances() {
  const response = await api.get("/api/compliance");
  return response.data.data;
}

export async function getComplianceById(id) {
  const response = await api.get(`/api/compliance/${id}`);
  return response.data.data;
}

export async function createCompliance(payload) {
  const response = await api.post("/api/compliance", payload);
  return response.data.data;
}

export async function updateCompliance(id, payload) {
  const response = await api.put(`/api/compliance/${id}`, payload);
  return response.data.data;
}

export async function deleteCompliance(id) {
  await api.delete(`/api/compliance/${id}`);
}
