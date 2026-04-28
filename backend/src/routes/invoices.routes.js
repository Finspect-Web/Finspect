const express = require("express");
const {
  createInvoiceController,
  getInvoicesController,
  getInvoiceByIdController,
  updateInvoiceController,
  deleteInvoiceController,
  addPaymentController,
  getInvoicePaymentsController
} = require("../controllers/invoices.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), createInvoiceController);
router.get("/", getInvoicesController);
router.get("/:id", getInvoiceByIdController);
router.put("/:id", authorize("ADMIN"), updateInvoiceController);
router.delete("/:id", authorize("ADMIN"), deleteInvoiceController);
router.post("/:id/payments", authorize("ADMIN"), addPaymentController);
router.get("/:id/payments", getInvoicePaymentsController);

module.exports = router;
