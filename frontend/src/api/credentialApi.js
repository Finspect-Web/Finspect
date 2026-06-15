import api from "./axios";

export async function getCredentials(clientId) {
  const response = await api.get(`/api/credentials/${clientId}`);
  return response.data.data;
}

export async function getCredentialPassword(id) {
  const response = await api.get(`/api/credentials/${id}/password`);
  return response.data.data;
}

export async function createCredential(payload) {
  const response = await api.post("/api/credentials", payload);
  return response.data.data;
}

export async function updateCredential(id, payload) {
  const response = await api.put(`/api/credentials/${id}`, payload);
  return response.data.data;
}

export async function deleteCredential(id) {
  await api.delete(`/api/credentials/${id}`);
}
