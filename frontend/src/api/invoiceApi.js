import api from "./axios";

export async function getInvoices() {
  const response = await api.get("/invoices");
  return response.data.data;
}

export async function getInvoiceById(id) {
  const response = await api.get(`/invoices/${id}`);
  return response.data.data;
}

export async function createInvoice(payload) {
  const response = await api.post("/invoices", payload);
  return response.data.data;
}

export async function updateInvoice(id, payload) {
  const response = await api.put(`/invoices/${id}`, payload);
  return response.data.data;
}

export async function deleteInvoice(id) {
  await api.delete(`/invoices/${id}`);
}

export async function addInvoicePayment(id, payload) {
  const response = await api.post(`/invoices/${id}/payments`, payload);
  return response.data.data;
}

export async function getInvoicePayments(id) {
  const response = await api.get(`/invoices/${id}/payments`);
  return response.data.data;
}
