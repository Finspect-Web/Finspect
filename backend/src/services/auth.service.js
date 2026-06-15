const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { signToken } = require("../utils/jwt");
const { isDummyMode } = require("../utils/mode");
const { users } = require("../utils/dummyStore");

async function loginUser(payload) {
  const { email, password } = payload;
  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  if (isDummyMode()) {
    const user = users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

    if (!user) {
      throw new AppError("Invalid credentials.", 401);
    }

    if (user.isActive === false) {
      throw new AppError("Account has been disabled. Please contact administrator.", 403);
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      isActive: true
    }
  });

  if (!user) {
    throw new AppError("Invalid credentials.", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account has been disabled. Please contact administrator.", 403);
  }

  // [DEBUG] Log bcrypt comparison details (remove after debugging)
  console.log("[DEBUG] bcrypt.compare input password:", password);
  console.log("[DEBUG] bcrypt.compare stored hash:", user.password);
  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log("[DEBUG] bcrypt.compare result:", isPasswordValid);
  if (!isPasswordValid) {
    // Log hash prefix and user info for debugging without exposing the full hash
    console.log("[DEBUG] Password mismatch for:", user.email);
    console.log("[DEBUG] Stored hash prefix:", user.password.substring(0, 20) + "...");
    throw new AppError("Invalid credentials.", 401);
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

module.exports = {
  loginUser
};
