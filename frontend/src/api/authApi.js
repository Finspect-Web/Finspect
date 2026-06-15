import api from "./axios";

export async function loginRequest(payload) {
  const response = await api.post("/api/auth/login", payload);
  return response.data.data;
}
