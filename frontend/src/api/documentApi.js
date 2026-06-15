import api from "./axios";

export async function getDocuments(clientId) {
  const response = await api.get(`/api/documents/client/${clientId}`);
  return response.data.data;
}

export async function getDocumentById(id) {
  const response = await api.get(`/api/documents/${id}`);
  return response.data.data;
}

export async function createDocument(payload) {
  const response = await api.post("/api/documents", payload);
  return response.data.data;
}
