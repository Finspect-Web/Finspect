const asyncHandler = require("../utils/asyncHandler");
const {
  getTaskStages,
  createTaskStage,
  updateTaskStage,
  deleteTaskStage
} = require("../services/taskStages.service");

const getTaskStagesController = asyncHandler(async (req, res) => {
  const data = await getTaskStages();
  res.status(200).json({
    success: true,
    data
  });
});

const createTaskStageController = asyncHandler(async (req, res) => {
  const data = await createTaskStage(req.body);
  res.status(201).json({
    success: true,
    message: "Task stage created successfully.",
    data
  });
});

const updateTaskStageController = asyncHandler(async (req, res) => {
  const data = await updateTaskStage(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Task stage updated successfully.",
    data
  });
});

const deleteTaskStageController = asyncHandler(async (req, res) => {
  await deleteTaskStage(req.params.id);
  res.status(200).json({
    success: true,
    message: "Task stage deleted successfully."
  });
});

module.exports = {
  getTaskStagesController,
  createTaskStageController,
  updateTaskStageController,
  deleteTaskStageController
};
