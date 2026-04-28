import api from "./axios";

export async function getClients() {
  const response = await api.get("/clients");
  return response.data.data;
}

export async function getClientById(id) {
  const response = await api.get(`/clients/${id}`);
  return response.data.data;
}

export async function createClient(payload) {
  const response = await api.post("/clients", payload);
  return response.data.data;
}

export async function updateClient(id, payload) {
  const response = await api.put(`/clients/${id}`, payload);
  return response.data.data;
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`);
}
