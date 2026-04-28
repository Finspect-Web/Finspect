const express = require("express");
const {
  createComplianceTypeController,
  getComplianceTypesController,
  createWorkflowTemplateController,
  getWorkflowByComplianceTypeController,
  createWorkflowStepController,
  getWorkflowStepsController,
  generateTasksController
} = require("../controllers/workflowEngine.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/compliance-types", authorize("ADMIN"), createComplianceTypeController);
router.get("/compliance-types", getComplianceTypesController);

router.post("/workflows", authorize("ADMIN"), createWorkflowTemplateController);
router.get("/workflows/:complianceTypeId", getWorkflowByComplianceTypeController);

router.post("/workflow-steps", authorize("ADMIN"), createWorkflowStepController);
router.get("/workflow-steps/:workflowId", getWorkflowStepsController);

router.post("/generate-tasks", authorize("ADMIN"), generateTasksController);

module.exports = router;
