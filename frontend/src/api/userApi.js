import api from "./axios";

export async function getUsers() {
  const response = await api.get("/users");
  return response.data.data;
}

export async function createUser(payload) {
  const response = await api.post("/users", payload);
  return response.data;
}

export async function updateUser(id, payload) {
  const response = await api.put(`/users/${id}`, payload);
  return response.data;
}

export async function resetPassword(id, password) {
  const response = await api.patch(`/users/${id}/reset-password`, { password });
  return response.data;
}

export async function deactivateUser(id) {
  const response = await api.patch(`/users/${id}/deactivate`);
  return response.data;
}

export async function activateUser(id) {
  const response = await api.patch(`/users/${id}/activate`);
  return response.data;
}

export async function deleteUser(id) {
  const response = await api.delete(`/users/${id}`);
  return response.data;
}
