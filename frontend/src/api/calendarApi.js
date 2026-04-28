import api from "./axios";

export async function getCalendarEvents(params) {
  const response = await api.get("/calendar/events", { params });
  return response.data.data;
}
