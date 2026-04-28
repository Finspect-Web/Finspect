const { Role, TaskStatus } = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { tasks, clients, users, activityLogs } = require("../utils/dummyStore");

const activityInclude = {
  performedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
};

async function getDashboardSummary(actor) {
  if (isDummyMode()) {
    const baseTasks = actor.role === Role.ADMIN ? tasks : tasks.filter((item) => item.assignedToId === actor.id);
    const pendingTasks = baseTasks.filter((item) => item.status === TaskStatus.PENDING);
    const completedTasks = baseTasks.filter((item) => item.status === TaskStatus.COMPLETED);
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const hydrateTask = (task) => {
      const client = clients.find((item) => item.id === task.clientId);
      const assignedTo = users.find((item) => item.id === task.assignedToId);
      return {
        ...task,
        client: client
          ? {
              id: client.id,
              name: client.name,
              companyName: client.companyName
            }
          : null,
        assignedTo: assignedTo
          ? {
              id: assignedTo.id,
              name: assignedTo.name
            }
          : null
      };
    };

    return {
      stats: {
        totalTasks: baseTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        notificationCount: pendingTasks.filter(
          (item) => new Date(item.dueDate).getTime() >= now.getTime() && new Date(item.dueDate).getTime() <= nextDay.getTime()
        ).length
      },
      upcomingTasks: pendingTasks
        .slice()
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10)
        .map(hydrateTask),
      recentCompletedTasks: completedTasks
        .slice()
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 10)
        .map(hydrateTask)
    };
  }

  const where = actor.role === Role.ADMIN ? {} : { assignedToId: actor.id };
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [totalTasks, completedTasks, pendingTasks, upcomingTasks, recentCompletedTasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: TaskStatus.COMPLETED } }),
    prisma.task.count({ where: { ...where, status: TaskStatus.PENDING } }),
    prisma.task.findMany({
      where: {
        ...where,
        status: TaskStatus.PENDING
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
            name: true
          }
        }
      },
      orderBy: { dueDate: "asc" },
      take: 10
    }),
    prisma.task.findMany({
      where: {
        ...where,
        status: TaskStatus.COMPLETED
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
            name: true
          }
        }
      },
      orderBy: { dueDate: "desc" },
      take: 10
    })
  ]);

  const notificationCount = await prisma.task.count({
    where: {
      ...where,
      status: TaskStatus.PENDING,
      dueDate: {
        gte: now,
        lte: nextDay
      }
    }
  });

  return {
    stats: {
      totalTasks,
      completedTasks,
      pendingTasks,
      notificationCount
    },
    upcomingTasks,
    recentCompletedTasks
  };
}

async function getActivityLogs(actor) {
  if (isDummyMode()) {
    const logs = actor.role === Role.ADMIN ? activityLogs : activityLogs.filter((item) => item.performedById === actor.id);
    return logs
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)
      .map((entry) => {
        const performer = users.find((item) => item.id === entry.performedById);
        return {
          ...entry,
          performedBy: performer
            ? {
                id: performer.id,
                name: performer.name,
                email: performer.email,
                role: performer.role
              }
            : {
                id: entry.performedById,
                name: "Unknown User",
                email: "-",
                role: "STAFF"
              }
        };
      });
  }

  const where = actor.role === Role.ADMIN ? {} : { performedById: actor.id };
  return prisma.activityLog.findMany({
    where,
    include: activityInclude,
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });
}

async function getStaffMonitoring(actor) {
  if (actor.role !== Role.ADMIN) {
    throw new AppError("Only admin can access staff monitoring.", 403);
  }

  if (isDummyMode()) {
    return users
      .filter((item) => item.role === Role.STAFF)
      .map((member) => {
        const memberTasks = tasks.filter((task) => task.assignedToId === member.id);
        const lastActivity = activityLogs
          .filter((item) => item.performedById === member.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          pendingTasks: memberTasks.filter((item) => item.status === TaskStatus.PENDING).length,
          completedTasks: memberTasks.filter((item) => item.status === TaskStatus.COMPLETED).length,
          lastActivityAt: lastActivity?.createdAt || null
        };
      });
  }

  const staff = await prisma.user.findMany({
    where: { role: Role.STAFF },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  const groupedTasks = await prisma.task.groupBy({
    by: ["assignedToId", "status"],
    _count: {
      id: true
    }
  });

  const map = new Map();
  groupedTasks.forEach((entry) => {
    const existing = map.get(entry.assignedToId) || { pending: 0, completed: 0 };
    if (entry.status === TaskStatus.PENDING) existing.pending = entry._count.id;
    if (entry.status === TaskStatus.COMPLETED) existing.completed = entry._count.id;
    map.set(entry.assignedToId, existing);
  });

  const monitoring = await Promise.all(
    staff.map(async (member) => {
      const lastActivity = await prisma.activityLog.findFirst({
        where: { performedById: member.id },
        orderBy: { createdAt: "desc" }
      });

      return {
        ...member,
        pendingTasks: map.get(member.id)?.pending || 0,
        completedTasks: map.get(member.id)?.completed || 0,
        lastActivityAt: lastActivity?.createdAt || null
      };
    })
  );

  return monitoring;
}

module.exports = {
  getDashboardSummary,
  getActivityLogs,
  getStaffMonitoring
};
