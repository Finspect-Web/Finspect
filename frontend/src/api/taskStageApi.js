import api from "./axios";

export async function getTaskStages() {
  const response = await api.get("/api/task-stages");
  return response.data.data;
}

export async function createTaskStage(payload) {
  const response = await api.post("/api/task-stages", payload);
  return response.data.data;
}

export async function updateTaskStage(id, payload) {
  const response = await api.put(`/api/task-stages/${id}`, payload);
  return response.data.data;
}

export async function deleteTaskStage(id) {
  await api.delete(`/api/task-stages/${id}`);
}
