const express = require("express");
const {
  createComplianceController,
  getCompliancesController,
  getComplianceByIdController,
  updateComplianceController,
  deleteComplianceController
} = require("../controllers/compliance.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), createComplianceController);
router.get("/", getCompliancesController);
router.get("/:id", getComplianceByIdController);
router.put("/:id", updateComplianceController);
router.delete("/:id", authorize("ADMIN"), deleteComplianceController);

module.exports = router;
