import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClients } from "../api/clientApi";
import { addInvoicePayment, createInvoice, deleteInvoice, getInvoices } from "../api/invoiceApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/date";

const emptyInvoiceForm = {
  clientId: "",
  invoiceNumber: "",
  issueDate: "",
  dueDate: "",
  subtotal: "",
  taxAmount: "",
  discountAmount: "",
  notes: ""
};

const emptyPaymentForm = {
  amount: "",
  paymentDate: "",
  method: "BANK_TRANSFER",
  reference: "",
  notes: ""
};

const statusStyle = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300"
};

export default function BillingPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [openInvoiceForm, setOpenInvoiceForm] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const loadData = useCallback(async () => {
    try {
      const [clientData, invoiceData] = await Promise.all([getClients(), getInvoices()]);
      setClients(clientData);
      setInvoices(invoiceData);
      if (!invoiceForm.clientId && clientData[0]) {
        setInvoiceForm((prev) => ({ ...prev, clientId: clientData[0].id }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [invoiceForm.clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const statusMatch = statusFilter === "ALL" || invoice.status === statusFilter;
      if (!statusMatch) return false;
      if (!query) return true;
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.client.companyName.toLowerCase().includes(query) ||
        invoice.client.name.toLowerCase().includes(query)
      );
    });
  }, [invoices, search, statusFilter]);

  const onCreateInvoice = async (event) => {
    event.preventDefault();
    try {
      await createInvoice({
        ...invoiceForm,
        subtotal: Number(invoiceForm.subtotal),
        taxAmount: Number(invoiceForm.taxAmount || 0),
        discountAmount: Number(invoiceForm.discountAmount || 0)
      });
      setOpenInvoiceForm(false);
      setInvoiceForm(emptyInvoiceForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await deleteInvoice(invoiceId);
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const onSubmitPayment = async (event) => {
    event.preventDefault();
    if (!paymentInvoice) return;
    try {
      await addInvoicePayment(paymentInvoice.id, {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      setPaymentInvoice(null);
      setPaymentForm(emptyPaymentForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Billing & Invoices</h1>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setOpenInvoiceForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            New Invoice
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoice/client..."
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
        </select>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Issue / Due</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-3 font-semibold">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3">
                  <p>{invoice.client.companyName}</p>
                  <p className="text-xs text-slate-500">{invoice.client.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{formatDate(invoice.issueDate)}</p>
                  <p className="text-xs text-slate-500">Due: {formatDate(invoice.dueDate)}</p>
                </td>
                <td className="px-4 py-3">₹ {invoice.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-3">₹ {invoice.paidAmount.toLocaleString()}</td>
                <td className="px-4 py-3">₹ {invoice.outstandingAmount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      statusStyle[invoice.status] || statusStyle.DRAFT
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          disabled={invoice.outstandingAmount <= 0}
                          onClick={() => {
                            setPaymentInvoice(invoice);
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: String(invoice.outstandingAmount),
                              paymentDate: new Date().toISOString().slice(0, 10)
                            }));
                          }}
                          className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Record Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(invoice.id)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">View only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No invoices found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openInvoiceForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-soft dark:bg-slate-900">
            <h2 className="text-xl font-bold">Create Invoice</h2>
            <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreateInvoice}>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Client</span>
                <select
                  required
                  value={invoiceForm.clientId}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, clientId: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Invoice Number</span>
                <input
                  required
                  value={invoiceForm.invoiceNumber}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Issue Date</span>
                <input
                  required
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Due Date</span>
                <input
                  required
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Subtotal</span>
                <input
                  required
                  type="number"
                  min="0"
                  value={invoiceForm.subtotal}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, subtotal: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Tax Amount</span>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.taxAmount}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, taxAmount: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Discount Amount</span>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.discountAmount}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, discountAmount: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-slate-600">Notes</span>
                <input
                  value={invoiceForm.notes}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenInvoiceForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {paymentInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-soft dark:bg-slate-900">
            <h2 className="text-xl font-bold">Record Payment</h2>
            <p className="mt-1 text-sm text-slate-500">Invoice: {paymentInvoice.invoiceNumber}</p>
            <form className="mt-4 grid gap-3" onSubmit={onSubmitPayment}>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Amount</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Payment Date</span>
                <input
                  required
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Method</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Reference</span>
                <input
                  value={paymentForm.reference}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Notes</span>
                <input
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
