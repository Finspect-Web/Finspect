import api from "./axios";

export async function getInvoices() {
  const response = await api.get("/api/invoices");
  return response.data.data;
}

export async function getInvoiceById(id) {
  const response = await api.get(`/api/invoices/${id}`);
  return response.data.data;
}

export async function createInvoice(payload) {
  const response = await api.post("/api/invoices", payload);
  return response.data.data;
}

export async function updateInvoice(id, payload) {
  const response = await api.put(`/api/invoices/${id}`, payload);
  return response.data.data;
}

export async function deleteInvoice(id) {
  await api.delete(`/api/invoices/${id}`);
}

export async function addInvoicePayment(id, payload) {
  const response = await api.post(`/api/invoices/${id}/payments`, payload);
  return response.data.data;
}

export async function getInvoicePayments(id) {
  const response = await api.get(`/api/invoices/${id}/payments`);
  return response.data.data;
}
