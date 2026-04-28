const asyncHandler = require("../utils/asyncHandler");
const {
  createCompliance,
  getCompliances,
  getComplianceById,
  updateCompliance,
  deleteCompliance
} = require("../services/compliance.service");

const createComplianceController = asyncHandler(async (req, res) => {
  const data = await createCompliance(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Compliance item created successfully.",
    data
  });
});

const getCompliancesController = asyncHandler(async (req, res) => {
  const data = await getCompliances(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getComplianceByIdController = asyncHandler(async (req, res) => {
  const data = await getComplianceById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const updateComplianceController = asyncHandler(async (req, res) => {
  const data = await updateCompliance(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: "Compliance item updated successfully.",
    data
  });
});

const deleteComplianceController = asyncHandler(async (req, res) => {
  await deleteCompliance(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Compliance item deleted successfully."
  });
});

module.exports = {
  createComplianceController,
  getCompliancesController,
  getComplianceByIdController,
  updateComplianceController,
  deleteComplianceController
};
