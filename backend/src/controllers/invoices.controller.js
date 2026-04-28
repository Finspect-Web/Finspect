const asyncHandler = require("../utils/asyncHandler");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getInvoicePayments
} = require("../services/invoices.service");

const createInvoiceController = asyncHandler(async (req, res) => {
  const data = await createInvoice(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Invoice created successfully.",
    data
  });
});

const getInvoicesController = asyncHandler(async (req, res) => {
  const data = await getInvoices(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getInvoiceByIdController = asyncHandler(async (req, res) => {
  const data = await getInvoiceById(req.params.id);
  res.status(200).json({
    success: true,
    data
  });
});

const updateInvoiceController = asyncHandler(async (req, res) => {
  const data = await updateInvoice(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "Invoice updated successfully.",
    data
  });
});

const deleteInvoiceController = asyncHandler(async (req, res) => {
  await deleteInvoice(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully."
  });
});

const addPaymentController = asyncHandler(async (req, res) => {
  const data = await addPayment(req.params.id, req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Payment recorded successfully.",
    data
  });
});

const getInvoicePaymentsController = asyncHandler(async (req, res) => {
  const data = await getInvoicePayments(req.params.id);
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  createInvoiceController,
  getInvoicesController,
  getInvoiceByIdController,
  updateInvoiceController,
  deleteInvoiceController,
  addPaymentController,
  getInvoicePaymentsController
};
