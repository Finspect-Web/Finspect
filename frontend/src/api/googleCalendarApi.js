import api from "./axios";

export async function getGoogleAuthUrl() {
  const response = await api.get("/api/auth/google");
  return response.data.data.authUrl;
}

export async function getGoogleCalendarStatus() {
  const response = await api.get("/api/auth/google/status");
  return response.data.data;
}

export async function disconnectGoogleCalendar() {
  const response = await api.post("/api/auth/google/disconnect");
  return response.data;
}

export async function getGoogleCalendarEvents(params = {}) {
  const response = await api.get("/api/google-calendar/events", { params });
  return response.data.data;
}
