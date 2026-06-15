import api from "./axios";

export async function getClients() {
  const response = await api.get("/api/clients");
  return response.data.data;
}

export async function getClientById(id) {
  const response = await api.get(`/api/clients/${id}`);
  return response.data.data;
}

export async function createClient(payload) {
  const response = await api.post("/api/clients", payload);
  return response.data.data;
}

export async function updateClient(id, payload) {
  const response = await api.put(`/api/clients/${id}`, payload);
  return response.data.data;
}

export async function deleteClient(id) {
  await api.delete(`/api/clients/${id}`);
}
