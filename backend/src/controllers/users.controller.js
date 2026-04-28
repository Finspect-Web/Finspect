const asyncHandler = require("../utils/asyncHandler");
const { getAllUsers } = require("../services/users.service");

const getUsers = asyncHandler(async (req, res) => {
  const data = await getAllUsers();
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getUsers
};
