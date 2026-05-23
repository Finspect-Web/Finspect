import api from "./axios";

export async function loginRequest(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data.data;
}

export async function registerUser(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data.data;
}

export async function signupRequest(payload) {
  const response = await api.post("/auth/signup", payload);
  return response.data.data;
}
