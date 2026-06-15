import api from "./axios";

export async function getUsers() {
  const response = await api.get("/api/users");
  return response.data.data;
}

export async function createUser(payload) {
  const response = await api.post("/api/users", payload);
  return response.data;
}

export async function updateUser(id, payload) {
  const response = await api.put(`/api/users/${id}`, payload);
  return response.data;
}

export async function resetPassword(id, password) {
  const response = await api.patch(`/api/users/${id}/reset-password`, { password });
  return response.data;
}

export async function deactivateUser(id) {
  const response = await api.patch(`/api/users/${id}/deactivate`);
  return response.data;
}

export async function activateUser(id) {
  const response = await api.patch(`/api/users/${id}/activate`);
  return response.data;
}

export async function deleteUser(id) {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
}
