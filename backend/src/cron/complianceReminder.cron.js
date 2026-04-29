const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const { isDummyMode } = require("../utils/mode");
const { compliances, clients, findUserById } = require("../utils/dummyStore");
const { sendComplianceReminderNotifications } = require("../utils/notification");

const ComplianceStatus = prismaTypes.ComplianceStatus || {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE"
};

function getTomorrowRange() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function hydrateDummyCompliance(item) {
  const client = clients.find((entry) => entry.id === item.clientId);
  const assignedTo = findUserById(item.assignedToId);
  const createdBy = findUserById(item.createdById);

  if (!client || !assignedTo || !createdBy) {
    return null;
  }

  return {
    ...item,
    client: {
      id: client.id,
      name: client.name,
      companyName: client.companyName
    },
    assignedTo: {
      id: assignedTo.id,
      name: assignedTo.name,
      email: assignedTo.email
    },
    createdBy: {
      id: createdBy.id,
      name: createdBy.name,
      email: createdBy.email
    }
  };
}

async function getDueCompliancesForReminder() {
  const { start, end } = getTomorrowRange();

  if (isDummyMode()) {
    return compliances
      .filter(
        (item) =>
          [ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS].includes(item.status) &&
          new Date(item.dueDate) >= start &&
          new Date(item.dueDate) <= end
      )
      .map(hydrateDummyCompliance)
      .filter(Boolean);
  }

  return prisma.complianceItem.findMany({
    where: {
      status: {
        in: [ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS]
      },
      dueDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

function startComplianceReminderCron() {
  const cron = require("node-cron");

  cron.schedule("0 9 * * *", async () => {
    try {
      const complianceItems = await getDueCompliancesForReminder();
      for (const compliance of complianceItems) {
        await sendComplianceReminderNotifications(compliance);
      }
    } catch (error) {
      console.error("Compliance reminder cron failed:", error.message);
    }
  });
}

module.exports = {
  startComplianceReminderCron
};
