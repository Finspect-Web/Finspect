const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const {
  tasks,
  compliances,
  attendances,
  timesheetEntries,
  clients,
  findUserById
} = require("../utils/dummyStore");

const Role = prismaTypes.Role || { ADMIN: "ADMIN", STAFF: "STAFF" };

function parseRange(fromValue, toValue) {
  const from = new Date(fromValue || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = new Date(toValue || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError("from and to must be valid dates.", 400);
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (from.getTime() > to.getTime()) {
    throw new AppError("from date must be before to date.", 400);
  }

  return { from, to };
}

function getClientSummary(clientId) {
  const client = clients.find((item) => item.id === clientId);
  if (!client) return null;
  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName
  };
}

function buildDummyEvents(actor, from, to) {
  const events = [];

  tasks
    .filter((item) => {
      const time = new Date(item.dueDate).getTime();
      if (time < from.getTime() || time > to.getTime()) return false;
      return actor.role === Role.ADMIN || item.assignedToId === actor.id;
    })
    .forEach((item) => {
      events.push({
        id: `task:${item.id}`,
        type: "TASK_DUE",
        title: item.title,
        startAt: item.dueDate,
        endAt: item.dueDate,
        color: "#4c2ca7",
        payload: {
          id: item.id,
          status: item.status,
          priority: item.priority,
          assignedTo: findUserById(item.assignedToId),
          client: getClientSummary(item.clientId)
        }
      });
    });

  compliances
    .filter((item) => {
      const time = new Date(item.dueDate).getTime();
      if (time < from.getTime() || time > to.getTime()) return false;
      return actor.role === Role.ADMIN || item.assignedToId === actor.id;
    })
    .forEach((item) => {
      events.push({
        id: `compliance:${item.id}`,
        type: "COMPLIANCE_DUE",
        title: item.title,
        startAt: item.dueDate,
        endAt: item.dueDate,
        color: "#0f766e",
        payload: {
          id: item.id,
          status: item.status,
          recurrence: item.recurrence,
          type: item.type,
          assignedTo: findUserById(item.assignedToId),
          client: getClientSummary(item.clientId)
        }
      });
    });

  attendances
    .filter((item) => {
      const time = new Date(item.date).getTime();
      if (time < from.getTime() || time > to.getTime()) return false;
      return actor.role === Role.ADMIN || item.userId === actor.id;
    })
    .forEach((item) => {
      events.push({
        id: `attendance:${item.id}`,
        type: "ATTENDANCE",
        title: `${findUserById(item.userId)?.name || "User"} - ${item.status}`,
        startAt: item.date,
        endAt: item.date,
        color: "#b45309",
        payload: {
          id: item.id,
          status: item.status,
          checkInAt: item.checkInAt,
          checkOutAt: item.checkOutAt,
          user: findUserById(item.userId)
        }
      });
    });

  timesheetEntries
    .filter((item) => {
      const time = new Date(item.workDate).getTime();
      if (time < from.getTime() || time > to.getTime()) return false;
      return actor.role === Role.ADMIN || item.userId === actor.id;
    })
    .forEach((item) => {
      events.push({
        id: `timesheet:${item.id}`,
        type: "TIMESHEET",
        title: `${findUserById(item.userId)?.name || "User"} - ${item.durationMinutes} min`,
        startAt: item.workDate,
        endAt: item.workDate,
        color: "#1d4ed8",
        payload: {
          id: item.id,
          description: item.description,
          billable: item.billable,
          durationMinutes: item.durationMinutes,
          user: findUserById(item.userId),
          client: getClientSummary(item.clientId),
          task: tasks.find((task) => task.id === item.taskId) || null
        }
      });
    });

  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

async function getCalendarEvents(actor, query = {}) {
  const { from, to } = parseRange(query.from, query.to);

  if (isDummyMode()) {
    const events = buildDummyEvents(actor, from, to);
    return {
      from,
      to,
      totalEvents: events.length,
      events
    };
  }

  const [taskRows, complianceRows, attendanceRows, timesheetRows] = await Promise.all([
    prisma.task.findMany({
      where: {
        dueDate: {
          gte: from,
          lte: to
        },
        ...(actor.role === Role.ADMIN ? {} : { assignedToId: actor.id })
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    }),
    prisma.complianceItem.findMany({
      where: {
        dueDate: {
          gte: from,
          lte: to
        },
        ...(actor.role === Role.ADMIN ? {} : { assignedToId: actor.id })
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        recurrence: true,
        type: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    }),
    prisma.attendance.findMany({
      where: {
        date: {
          gte: from,
          lte: to
        },
        ...(actor.role === Role.ADMIN ? {} : { userId: actor.id })
      },
      select: {
        id: true,
        date: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    }),
    prisma.timesheetEntry.findMany({
      where: {
        workDate: {
          gte: from,
          lte: to
        },
        ...(actor.role === Role.ADMIN ? {} : { userId: actor.id })
      },
      select: {
        id: true,
        workDate: true,
        durationMinutes: true,
        description: true,
        billable: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })
  ]);

  const events = [
    ...taskRows.map((item) => ({
      id: `task:${item.id}`,
      type: "TASK_DUE",
      title: item.title,
      startAt: item.dueDate,
      endAt: item.dueDate,
      color: "#4c2ca7",
      payload: item
    })),
    ...complianceRows.map((item) => ({
      id: `compliance:${item.id}`,
      type: "COMPLIANCE_DUE",
      title: item.title,
      startAt: item.dueDate,
      endAt: item.dueDate,
      color: "#0f766e",
      payload: item
    })),
    ...attendanceRows.map((item) => ({
      id: `attendance:${item.id}`,
      type: "ATTENDANCE",
      title: `${item.user.name} - ${item.status}`,
      startAt: item.date,
      endAt: item.date,
      color: "#b45309",
      payload: item
    })),
    ...timesheetRows.map((item) => ({
      id: `timesheet:${item.id}`,
      type: "TIMESHEET",
      title: `${item.user.name} - ${item.durationMinutes} min`,
      startAt: item.workDate,
      endAt: item.workDate,
      color: "#1d4ed8",
      payload: item
    }))
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return {
    from,
    to,
    totalEvents: events.length,
    events
  };
}

module.exports = {
  getCalendarEvents
};
