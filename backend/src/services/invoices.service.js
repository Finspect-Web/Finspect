const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { logActivity } = require("./activity.service");
const ActivityAction = require("../constants/activityActions");
const { invoices, payments, clients, users, createId, findUserById } = require("../utils/dummyStore");

const Role = prismaTypes.Role;
const InvoiceStatus = prismaTypes.InvoiceStatus || {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE"
};
const PaymentMethod = prismaTypes.PaymentMethod || {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  UPI: "UPI",
  CARD: "CARD",
  CHEQUE: "CHEQUE",
  OTHER: "OTHER"
};

const ACTION_INVOICE_CREATED = ActivityAction.INVOICE_CREATED || "INVOICE_CREATED";
const ACTION_INVOICE_UPDATED = ActivityAction.INVOICE_UPDATED || "INVOICE_UPDATED";
const ACTION_INVOICE_DELETED = ActivityAction.INVOICE_DELETED || "INVOICE_DELETED";
const ACTION_PAYMENT_RECORDED = ActivityAction.PAYMENT_RECORDED || "PAYMENT_RECORDED";

const invoiceInclude = {
  client: {
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  payments: {
    orderBy: {
      paymentDate: "desc"
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  }
};

function ensurePaymentMethod(method) {
  if (!Object.values(PaymentMethod).includes(method)) {
    throw new AppError("Invalid payment method.", 400);
  }
}

function ensureInvoiceStatus(status) {
  if (!Object.values(InvoiceStatus).includes(status)) {
    throw new AppError("Invalid invoice status.", 400);
  }
}

function toNumber(value) {
  return typeof value === "number" ? value : Number(value);
}

function deriveInvoiceStatus(totalAmount, paidAmount, dueDate) {
  const total = toNumber(totalAmount);
  const paid = toNumber(paidAmount);
  if (paid <= 0) {
    return new Date(dueDate).getTime() < Date.now() ? InvoiceStatus.OVERDUE : InvoiceStatus.SENT;
  }
  if (paid >= total) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIALLY_PAID;
}

function normalizeInvoiceOutput(invoice) {
  const totalAmount = toNumber(invoice.totalAmount);
  const paidAmount = toNumber(invoice.paidAmount);
  return {
    ...invoice,
    subtotal: toNumber(invoice.subtotal),
    taxAmount: toNumber(invoice.taxAmount),
    discountAmount: toNumber(invoice.discountAmount),
    totalAmount,
    paidAmount,
    outstandingAmount: Number((totalAmount - paidAmount).toFixed(2)),
    payments: (invoice.payments || []).map((payment) => ({
      ...payment,
      amount: toNumber(payment.amount)
    }))
  };
}

function validateInvoicePayload(payload) {
  const { clientId, invoiceNumber, issueDate, dueDate, subtotal, taxAmount = 0, discountAmount = 0 } = payload;
  if (!clientId || !invoiceNumber || !issueDate || !dueDate || subtotal === undefined) {
    throw new AppError("clientId, invoiceNumber, issueDate, dueDate and subtotal are required.", 400);
  }

  const issue = new Date(issueDate);
  const due = new Date(dueDate);
  if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
    throw new AppError("issueDate and dueDate must be valid dates.", 400);
  }

  const sub = Number(subtotal);
  const tax = Number(taxAmount);
  const discount = Number(discountAmount);
  if ([sub, tax, discount].some((item) => Number.isNaN(item) || item < 0)) {
    throw new AppError("subtotal, taxAmount and discountAmount must be non-negative numbers.", 400);
  }

  return {
    issueDate: issue,
    dueDate: due,
    subtotal: sub,
    taxAmount: tax,
    discountAmount: discount,
    totalAmount: Number((sub + tax - discount).toFixed(2))
  };
}

async function createInvoice(payload, actorId) {
  const computed = validateInvoicePayload(payload);
  const status = payload.status || InvoiceStatus.SENT;
  ensureInvoiceStatus(status);

  if (isDummyMode()) {
    const client = clients.find((item) => item.id === payload.clientId);
    if (!client) throw new AppError("Client not found.", 404);
    const existingInvoice = invoices.find((item) => item.invoiceNumber === payload.invoiceNumber);
    if (existingInvoice) throw new AppError("Invoice number already exists.", 409);

    const createdBy = findUserById(actorId);
    if (!createdBy) throw new AppError("User not found.", 404);

    const invoice = {
      id: createId(),
      clientId: payload.clientId,
      invoiceNumber: payload.invoiceNumber,
      issueDate: computed.issueDate,
      dueDate: computed.dueDate,
      subtotal: computed.subtotal,
      taxAmount: computed.taxAmount,
      discountAmount: computed.discountAmount,
      totalAmount: computed.totalAmount,
      paidAmount: 0,
      status,
      notes: payload.notes || null,
      createdById: actorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    invoices.unshift(invoice);

    await logActivity(ACTION_INVOICE_CREATED, actorId, invoice.id);
    return normalizeInvoiceOutput({
      ...invoice,
      client,
      createdBy: {
        id: createdBy.id,
        name: createdBy.name,
        email: createdBy.email
      },
      payments: []
    });
  }

  const client = await prisma.client.findUnique({ where: { id: payload.clientId } });
  if (!client) throw new AppError("Client not found.", 404);

  const invoice = await prisma.invoice.create({
    data: {
      clientId: payload.clientId,
      invoiceNumber: payload.invoiceNumber,
      issueDate: computed.issueDate,
      dueDate: computed.dueDate,
      subtotal: computed.subtotal,
      taxAmount: computed.taxAmount,
      discountAmount: computed.discountAmount,
      totalAmount: computed.totalAmount,
      status,
      notes: payload.notes || null,
      createdById: actorId
    },
    include: invoiceInclude
  });

  await logActivity(ACTION_INVOICE_CREATED, actorId, invoice.id);
  return normalizeInvoiceOutput(invoice);
}

async function getInvoices(actor) {
  if (isDummyMode()) {
    return invoices
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((invoice) => {
        const client = clients.find((item) => item.id === invoice.clientId);
        const createdBy = findUserById(invoice.createdById);
        const invoicePayments = payments
          .filter((item) => item.invoiceId === invoice.id)
          .map((payment) => ({
            ...payment,
            createdBy: findUserById(payment.createdById)
          }));

        return normalizeInvoiceOutput({
          ...invoice,
          client,
          createdBy: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name,
                email: createdBy.email
              }
            : null,
          payments: invoicePayments
        });
      });
  }

  const where = actor.role === Role.ADMIN ? {} : { client: { createdById: actor.id } };
  const invoiceList = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
  return invoiceList.map((invoice) => normalizeInvoiceOutput(invoice));
}

async function getInvoiceById(id) {
  if (isDummyMode()) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) throw new AppError("Invoice not found.", 404);
    const client = clients.find((item) => item.id === invoice.clientId);
    const createdBy = findUserById(invoice.createdById);
    const invoicePayments = payments
      .filter((item) => item.invoiceId === invoice.id)
      .map((payment) => ({
        ...payment,
        createdBy: findUserById(payment.createdById)
      }));
    return normalizeInvoiceOutput({
      ...invoice,
      client,
      createdBy: createdBy
        ? {
            id: createdBy.id,
            name: createdBy.name,
            email: createdBy.email
          }
        : null,
      payments: invoicePayments
    });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude
  });
  if (!invoice) throw new AppError("Invoice not found.", 404);
  return normalizeInvoiceOutput(invoice);
}

async function updateInvoice(id, payload, actorId) {
  if (isDummyMode()) {
    const invoiceIndex = invoices.findIndex((item) => item.id === id);
    if (invoiceIndex === -1) throw new AppError("Invoice not found.", 404);
    const existing = invoices[invoiceIndex];
    const data = { ...existing };

    if (payload.clientId !== undefined) {
      const client = clients.find((item) => item.id === payload.clientId);
      if (!client) throw new AppError("Client not found.", 404);
      data.clientId = payload.clientId;
    }
    if (payload.invoiceNumber !== undefined) data.invoiceNumber = payload.invoiceNumber;
    if (payload.issueDate !== undefined) data.issueDate = new Date(payload.issueDate);
    if (payload.dueDate !== undefined) data.dueDate = new Date(payload.dueDate);
    if (payload.subtotal !== undefined) data.subtotal = Number(payload.subtotal);
    if (payload.taxAmount !== undefined) data.taxAmount = Number(payload.taxAmount);
    if (payload.discountAmount !== undefined) data.discountAmount = Number(payload.discountAmount);
    if (payload.notes !== undefined) data.notes = payload.notes || null;
    if (payload.status !== undefined) {
      ensureInvoiceStatus(payload.status);
      data.status = payload.status;
    }

    data.totalAmount = Number((data.subtotal + data.taxAmount - data.discountAmount).toFixed(2));
    data.paidAmount = Number(data.paidAmount);
    data.updatedAt = new Date();
    if (payload.status === undefined) {
      data.status = deriveInvoiceStatus(data.totalAmount, data.paidAmount, data.dueDate);
    }

    invoices[invoiceIndex] = data;
    await logActivity(ACTION_INVOICE_UPDATED, actorId, id);
    return getInvoiceById(id);
  }

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new AppError("Invoice not found.", 404);

  const data = {};
  if (payload.clientId !== undefined) data.clientId = payload.clientId;
  if (payload.invoiceNumber !== undefined) data.invoiceNumber = payload.invoiceNumber;
  if (payload.issueDate !== undefined) data.issueDate = new Date(payload.issueDate);
  if (payload.dueDate !== undefined) data.dueDate = new Date(payload.dueDate);
  if (payload.subtotal !== undefined) data.subtotal = Number(payload.subtotal);
  if (payload.taxAmount !== undefined) data.taxAmount = Number(payload.taxAmount);
  if (payload.discountAmount !== undefined) data.discountAmount = Number(payload.discountAmount);
  if (payload.notes !== undefined) data.notes = payload.notes || null;
  if (payload.status !== undefined) {
    ensureInvoiceStatus(payload.status);
    data.status = payload.status;
  }

  if (data.subtotal !== undefined || data.taxAmount !== undefined || data.discountAmount !== undefined) {
    const subtotal = data.subtotal !== undefined ? Number(data.subtotal) : Number(existing.subtotal);
    const taxAmount = data.taxAmount !== undefined ? Number(data.taxAmount) : Number(existing.taxAmount);
    const discountAmount =
      data.discountAmount !== undefined ? Number(data.discountAmount) : Number(existing.discountAmount);
    data.totalAmount = Number((subtotal + taxAmount - discountAmount).toFixed(2));
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields were provided for update.", 400);
  }

  if (data.status === undefined) {
    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : Number(existing.totalAmount);
    const paidAmount = Number(existing.paidAmount);
    const dueDate = data.dueDate || existing.dueDate;
    data.status = deriveInvoiceStatus(totalAmount, paidAmount, dueDate);
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data,
    include: invoiceInclude
  });

  await logActivity(ACTION_INVOICE_UPDATED, actorId, id);
  return normalizeInvoiceOutput(invoice);
}

async function deleteInvoice(id, actorId) {
  if (isDummyMode()) {
    const invoiceIndex = invoices.findIndex((item) => item.id === id);
    if (invoiceIndex === -1) throw new AppError("Invoice not found.", 404);
    invoices.splice(invoiceIndex, 1);
    for (let index = payments.length - 1; index >= 0; index -= 1) {
      if (payments[index].invoiceId === id) payments.splice(index, 1);
    }
    await logActivity(ACTION_INVOICE_DELETED, actorId, id);
    return;
  }

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new AppError("Invoice not found.", 404);
  await prisma.invoice.delete({ where: { id } });
  await logActivity(ACTION_INVOICE_DELETED, actorId, id);
}

async function addPayment(invoiceId, payload, actorId) {
  const { amount, paymentDate, method, reference, notes } = payload;
  if (amount === undefined || !paymentDate || !method) {
    throw new AppError("amount, paymentDate and method are required.", 400);
  }

  ensurePaymentMethod(method);
  const paidAmount = Number(amount);
  if (Number.isNaN(paidAmount) || paidAmount <= 0) {
    throw new AppError("amount must be a positive number.", 400);
  }

  const paidOn = new Date(paymentDate);
  if (Number.isNaN(paidOn.getTime())) {
    throw new AppError("paymentDate must be a valid date.", 400);
  }

  if (isDummyMode()) {
    const invoiceIndex = invoices.findIndex((item) => item.id === invoiceId);
    if (invoiceIndex === -1) throw new AppError("Invoice not found.", 404);

    const invoice = invoices[invoiceIndex];
    const outstanding = Number((invoice.totalAmount - invoice.paidAmount).toFixed(2));
    if (paidAmount > outstanding) {
      throw new AppError("Payment amount cannot exceed outstanding amount.", 400);
    }

    const payment = {
      id: createId(),
      invoiceId,
      amount: paidAmount,
      paymentDate: paidOn,
      method,
      reference: reference || null,
      notes: notes || null,
      createdById: actorId,
      createdAt: new Date()
    };
    payments.unshift(payment);

    const newPaidAmount = Number((invoice.paidAmount + paidAmount).toFixed(2));
    const updated = {
      ...invoice,
      paidAmount: newPaidAmount,
      status: deriveInvoiceStatus(invoice.totalAmount, newPaidAmount, invoice.dueDate),
      updatedAt: new Date()
    };
    invoices[invoiceIndex] = updated;

    await logActivity(ACTION_PAYMENT_RECORDED, actorId, payment.id);
    return getInvoiceById(invoiceId);
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError("Invoice not found.", 404);

  const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  if (paidAmount > outstanding) {
    throw new AppError("Payment amount cannot exceed outstanding amount.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: paidAmount,
        paymentDate: paidOn,
        method,
        reference: reference || null,
        notes: notes || null,
        createdById: actorId
      }
    });

    const nextPaidAmount = Number(invoice.paidAmount) + paidAmount;
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: nextPaidAmount,
        status: deriveInvoiceStatus(Number(invoice.totalAmount), nextPaidAmount, invoice.dueDate)
      }
    });
  });

  await logActivity(ACTION_PAYMENT_RECORDED, actorId, invoiceId);
  return getInvoiceById(invoiceId);
}

async function getInvoicePayments(invoiceId) {
  if (isDummyMode()) {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) throw new AppError("Invoice not found.", 404);
    return payments
      .filter((item) => item.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .map((payment) => ({
        ...payment,
        createdBy: findUserById(payment.createdById),
        amount: toNumber(payment.amount)
      }));
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError("Invoice not found.", 404);

  const paymentList = await prisma.payment.findMany({
    where: { invoiceId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      paymentDate: "desc"
    }
  });

  return paymentList.map((payment) => ({
    ...payment,
    amount: toNumber(payment.amount)
  }));
}

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getInvoicePayments
};
