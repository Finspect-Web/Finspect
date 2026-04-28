const asyncHandler = require("../utils/asyncHandler");
const {
  createComplianceType,
  getComplianceTypes,
  createWorkflowTemplate,
  getWorkflowByComplianceType,
  createWorkflowStep,
  getWorkflowSteps,
  createComplianceTasks
} = require("../services/workflowEngine.service");

const createComplianceTypeController = asyncHandler(async (req, res) => {
  const data = await createComplianceType(req.body);
  res.status(201).json({
    success: true,
    message: "Compliance type created successfully.",
    data
  });
});

const getComplianceTypesController = asyncHandler(async (req, res) => {
  const data = await getComplianceTypes();
  res.status(200).json({
    success: true,
    data
  });
});

const createWorkflowTemplateController = asyncHandler(async (req, res) => {
  const data = await createWorkflowTemplate(req.body);
  res.status(201).json({
    success: true,
    message: "Workflow template created successfully.",
    data
  });
});

const getWorkflowByComplianceTypeController = asyncHandler(async (req, res) => {
  const data = await getWorkflowByComplianceType(req.params.complianceTypeId);
  res.status(200).json({
    success: true,
    data
  });
});

const createWorkflowStepController = asyncHandler(async (req, res) => {
  const data = await createWorkflowStep(req.body);
  res.status(201).json({
    success: true,
    message: "Workflow step created successfully.",
    data
  });
});

const getWorkflowStepsController = asyncHandler(async (req, res) => {
  const data = await getWorkflowSteps(req.params.workflowId);
  res.status(200).json({
    success: true,
    data
  });
});

const generateTasksController = asyncHandler(async (req, res) => {
  const data = await createComplianceTasks({
    ...req.body,
    initiatedById: req.user.id
  });

  res.status(201).json({
    success: true,
    message: "Workflow tasks generated successfully.",
    data
  });
});

module.exports = {
  createComplianceTypeController,
  getComplianceTypesController,
  createWorkflowTemplateController,
  getWorkflowByComplianceTypeController,
  createWorkflowStepController,
  getWorkflowStepsController,
  generateTasksController
};
