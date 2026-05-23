const asyncHandler = require("../utils/asyncHandler");
const { loginUser, registerUser, signupUser } = require("../services/auth.service");

const login = asyncHandler(async (req, res) => {
  const data = await loginUser(req.body);
  res.status(200).json({
    success: true,
    message: "Login successful.",
    data
  });
});

const register = asyncHandler(async (req, res) => {
  const data = await registerUser(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "User created successfully.",
    data
  });
});

const signup = asyncHandler(async (req, res) => {
  const data = await signupUser(req.body);
  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data
  });
});

module.exports = {
  login,
  register,
  signup
};
