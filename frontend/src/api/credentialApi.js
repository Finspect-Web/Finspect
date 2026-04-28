import api from "./axios";

export async function getCredentials(clientId) {
  const response = await api.get(`/credentials/${clientId}`);
  return response.data.data;
}

export async function createCredential(payload) {
  const response = await api.post("/credentials", payload);
  return response.data.data;
}

export async function updateCredential(id, payload) {
  const response = await api.put(`/credentials/${id}`, payload);
  return response.data.data;
}

export async function deleteCredential(id) {
  await api.delete(`/credentials/${id}`);
}
