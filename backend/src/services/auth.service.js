const bcrypt = require("bcryptjs");
const { Role } = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { signToken } = require("../utils/jwt");
const { isDummyMode } = require("../utils/mode");
const { users, createId, getPublicUser } = require("../utils/dummyStore");
const ActivityAction = require("../constants/activityActions");
const { logActivity } = require("./activity.service");

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
      password: true
    }
  });

  if (!user) {
    throw new AppError("Invalid credentials.", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
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

async function registerUser(payload, actorId) {
  const { name, email, password, role = Role.STAFF } = payload;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (![Role.ADMIN, Role.STAFF].includes(role)) {
    throw new AppError("Role must be ADMIN or STAFF.", 400);
  }

  if (isDummyMode()) {
    const existingDummyUser = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (existingDummyUser) {
      throw new AppError("A user with this email already exists.", 409);
    }

    const user = {
      id: createId(),
      name,
      email,
      password,
      role,
      createdAt: new Date()
    };
    users.unshift(user);
    await logActivity(ActivityAction.USER_CREATED, actorId, user.id);
    return getPublicUser(user);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  await logActivity(ActivityAction.USER_CREATED, actorId, user.id);
  return user;
}

module.exports = {
  loginUser,
  registerUser
};
