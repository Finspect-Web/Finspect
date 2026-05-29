const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const {
  users,
  getPublicUser,
  createId,
  findUserById
} = require("../utils/dummyStore");
const { logActivity } = require("./activity.service");
const ActivityAction = require("../constants/activityActions");

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true
};

const userWithCreatorSelect = {
  ...publicUserSelect,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

async function getAllUsers() {
  if (isDummyMode()) {
    return users
      .filter((item) => !item.deletedAt)
      .map((item) => ({
        ...getPublicUser(item),
        isActive: item.isActive !== false,
        createdById: item.createdById || null,
        createdBy: item.createdById
          ? (() => {
              const creator = users.find((u) => u.id === item.createdById);
              return creator
                ? { id: creator.id, name: creator.name, email: creator.email }
                : null;
            })()
          : null
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return prisma.user.findMany({
    where: { deletedAt: null },
    select: userWithCreatorSelect,
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function createStaff(payload, actorId) {
  const { name, email, password, role = "STAFF" } = payload;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    throw new AppError("Role must be ADMIN or STAFF.", 400);
  }

  if (isDummyMode()) {
    const existingDummyUser = users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    );
    if (existingDummyUser) {
      throw new AppError("A user with this email already exists.", 409);
    }

    const user = {
      id: createId(),
      name,
      email,
      password,
      role,
      isActive: true,
      createdById: actorId,
      createdAt: new Date()
    };
    users.unshift(user);
    await logActivity(ActivityAction.USER_CREATED, actorId, user.id);
    return {
      ...getPublicUser(user),
      isActive: true,
      createdById: actorId
    };
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
      role,
      isActive: true,
      createdById: actorId
    },
    select: userWithCreatorSelect
  });

  await logActivity(ActivityAction.USER_CREATED, actorId, user.id);
  return user;
}

async function updateStaff(userId, payload, actorId) {
  const { name, email, role } = payload;

  if (!name && !email && !role) {
    throw new AppError("At least one field (name, email, role) must be provided.", 400);
  }

  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    if (email && email !== user.email) {
      const existing = users.find(
        (item) => item.email.toLowerCase() === email.toLowerCase() && item.id !== userId
      );
      if (existing) {
        throw new AppError("A user with this email already exists.", 409);
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    await logActivity(ActivityAction.USER_UPDATED, actorId, userId);
    return {
      ...getPublicUser(user),
      isActive: user.isActive !== false,
      createdById: user.createdById || null
    };
  }

  // Check user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  // Check email uniqueness if changing email
  if (email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken && emailTaken.id !== userId) {
      throw new AppError("A user with this email already exists.", 409);
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userWithCreatorSelect
  });

  await logActivity(ActivityAction.USER_UPDATED, actorId, userId);
  return user;
}

async function resetPassword(userId, newPassword, actorId) {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters long.", 400);
  }

  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    user.password = newPassword;
    await logActivity(ActivityAction.PASSWORD_RESET, actorId, userId);
    return { message: "Password reset successfully." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  await logActivity(ActivityAction.PASSWORD_RESET, actorId, userId);
  return { message: "Password reset successfully." };
}

async function deactivateStaff(userId, actorId) {
  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    user.isActive = false;
    await logActivity(ActivityAction.USER_DISABLED, actorId, userId);
    return { message: "User deactivated successfully." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });
  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  // Prevent deactivating yourself
  if (userId === actorId) {
    throw new AppError("You cannot deactivate your own account.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  await logActivity(ActivityAction.USER_DISABLED, actorId, userId);
  return { message: "User deactivated successfully." };
}

async function activateStaff(userId, actorId) {
  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    user.isActive = true;
    await logActivity(ActivityAction.USER_ENABLED, actorId, userId);
    return { message: "User activated successfully." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true }
  });

  await logActivity(ActivityAction.USER_ENABLED, actorId, userId);
  return { message: "User activated successfully." };
}

async function deleteStaff(userId, actorId) {
  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    // Prevent deleting yourself
    if (userId === actorId) {
      throw new AppError("You cannot delete your own account.", 400);
    }

    // Soft delete in dummy mode for consistency with DB mode
    user.deletedAt = new Date();
    user.isActive = false;
    await logActivity(ActivityAction.USER_DELETED, actorId, userId);
    return { message: `User "${user.name}" deleted successfully.` };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true }
  });
  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  // Prevent deleting yourself
  if (userId === actorId) {
    throw new AppError("You cannot delete your own account.", 400);
  }

  // Soft delete: set deletedAt timestamp
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      isActive: false
    }
  });

  await logActivity(ActivityAction.USER_DELETED, actorId, userId);
  return { message: `User "${existingUser.name}" deleted successfully.` };
}

module.exports = {
  getAllUsers,
  createStaff,
  updateStaff,
  resetPassword,
  deactivateStaff,
  activateStaff,
  deleteStaff
};
