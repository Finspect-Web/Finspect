const asyncHandler = require("../utils/asyncHandler");
const {
  getAllUsers,
  createStaff,
  updateStaff,
  resetPassword,
  deactivateStaff,
  activateStaff,
  deleteStaff
} = require("../services/users.service");

const getUsers = asyncHandler(async (req, res) => {
  const data = await getAllUsers();
  res.status(200).json({
    success: true,
    data
  });
});

const createUser = asyncHandler(async (req, res) => {
  const data = await createStaff(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "User created successfully.",
    data
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await updateStaff(id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    data
  });
});

const handleResetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const data = await resetPassword(id, password, req.user.id);
  res.status(200).json({
    success: true,
    message: data.message,
    data
  });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await deactivateStaff(id, req.user.id);
  res.status(200).json({
    success: true,
    message: data.message,
    data
  });
});

const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await activateStaff(id, req.user.id);
  res.status(200).json({
    success: true,
    message: data.message,
    data
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await deleteStaff(id, req.user.id);
  res.status(200).json({
    success: true,
    message: data.message,
    data
  });
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  handleResetPassword,
  deactivateUser,
  activateUser,
  deleteUser
};
