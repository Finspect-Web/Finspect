const prisma = require("../prisma/client");
const { isDummyMode } = require("../utils/mode");
const { activityLogs, createId } = require("../utils/dummyStore");

async function logActivity(action, performedById, referenceId) {
  if (isDummyMode()) {
    const log = {
      id: createId(),
      action,
      performedById,
      referenceId,
      createdAt: new Date()
    };
    activityLogs.unshift(log);
    return log;
  }

  return prisma.activityLog.create({
    data: {
      action,
      performedById,
      referenceId
    }
  });
}

module.exports = {
  logActivity
};
