const asyncHandler = require("../utils/asyncHandler");
const { createTask, getTasks, updateTask, deleteTask } = require("../services/tasks.service");

const createTaskController = asyncHandler(async (req, res) => {
  const data = await createTask(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Task created successfully.",
    data
  });
});

const getTasksController = asyncHandler(async (req, res) => {
  const data = await getTasks(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const updateTaskController = asyncHandler(async (req, res) => {
  const data = await updateTask(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: "Task updated successfully.",
    data
  });
});

const deleteTaskController = asyncHandler(async (req, res) => {
  await deleteTask(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Task deleted successfully."
  });
});

module.exports = {
  createTaskController,
  getTasksController,
  updateTaskController,
  deleteTaskController
};
