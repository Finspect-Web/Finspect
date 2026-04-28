const prisma = require("../prisma/client");
const { isDummyMode } = require("../utils/mode");
const { users, getPublicUser } = require("../utils/dummyStore");

async function getAllUsers() {
  if (isDummyMode()) {
    return users
      .map((item) => getPublicUser(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

module.exports = {
  getAllUsers
};
