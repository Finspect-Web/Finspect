const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { timesheetEntries, users, clients, tasks, createId, findUserById } = require("../utils/dummyStore");

const Role = prismaTypes.Role || { ADMIN: "ADMIN", STAFF: "STAFF" };

const entryInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
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
      status: true,
      dueDate: true
    }
  }
};

function normalizeDate(value, fieldName = "workDate") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid date.`, 400);
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeDuration(value) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new AppError("durationMinutes must be a positive integer.", 400);
  }
  return duration;
}

function parseDateRange(query = {}) {
  const from = query.from
    ? normalizeDate(query.from, "from")
    : normalizeDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "from");
  const to = query.to ? normalizeDate(query.to, "to") : normalizeDate(new Date(), "to");
  to.setHours(23, 59, 59, 999);

  if (from.getTime() > to.getTime()) {
    throw new AppError("from date must be before to date.", 400);
  }

  return { from, to };
}

function hydrateDummyEntry(entry) {
  const user = findUserById(entry.userId);
  const client = clients.find((item) => item.id === entry.clientId) || null;
  const task = tasks.find((item) => item.id === entry.taskId) || null;

  return {
    ...entry,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      : null,
    client: client
      ? {
          id: client.id,
          name: client.name,
          companyName: client.companyName
        }
      : null,
    task: task
      ? {
          id: task.id,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate
        }
      : null
  };
}

function buildSummary(entries) {
  const totalMinutes = entries.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
  const billableMinutes = entries
    .filter((item) => item.billable)
    .reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
  return {
    totalEntries: entries.length,
    totalMinutes,
    totalHours: Number((totalMinutes / 60).toFixed(2)),
    billableMinutes,
    billableHours: Number((billableMinutes / 60).toFixed(2))
  };
}

async function validateReferences(clientId, taskId) {
  if (!clientId && !taskId) return;

  if (isDummyMode()) {
    if (clientId && !clients.find((item) => item.id === clientId)) {
      throw new AppError("Client not found.", 404);
    }
    if (taskId && !tasks.find((item) => item.id === taskId)) {
      throw new AppError("Task not found.", 404);
    }
    return;
  }

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) {
      throw new AppError("Client not found.", 404);
    }
  }

  if (taskId) {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) {
      throw new AppError("Task not found.", 404);
    }
  }
}

async function createTimesheetEntry(payload, actor) {
  const userId = actor.role === Role.ADMIN ? String(payload.userId || actor.id).trim() : actor.id;
  if (!userId) {
    throw new AppError("userId is required.", 400);
  }

  if (actor.role !== Role.ADMIN && payload.userId && payload.userId !== actor.id) {
    throw new AppError("Staff can create entries only for self.", 403);
  }

  const workDate = normalizeDate(payload.workDate || new Date());
  const durationMinutes = normalizeDuration(payload.durationMinutes);
  const description = String(payload.description || "").trim();
  if (!description) {
    throw new AppError("description is required.", 400);
  }
  const clientId = payload.clientId || null;
  const taskId = payload.taskId || null;
  const billable = payload.billable === undefined ? true : Boolean(payload.billable);

  await validateReferences(clientId, taskId);

  if (isDummyMode()) {
    if (!users.find((item) => item.id === userId)) {
      throw new AppError("User not found.", 404);
    }

    const entry = {
      id: createId(),
      userId,
      clientId,
      taskId,
      workDate,
      durationMinutes,
      description,
      billable,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    timesheetEntries.unshift(entry);
    return hydrateDummyEntry(entry);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return prisma.timesheetEntry.create({
    data: {
      userId,
      clientId,
      taskId,
      workDate,
      durationMinutes,
      description,
      billable
    },
    include: entryInclude
  });
}

async function getTimesheetEntries(actor, query = {}) {
  const { from, to } = parseDateRange(query);

  if (isDummyMode()) {
    const filtered = timesheetEntries.filter((entry) => {
      const time = new Date(entry.workDate).getTime();
      if (time < from.getTime() || time > to.getTime()) return false;
      if (actor.role !== Role.ADMIN && entry.userId !== actor.id) return false;
      if (query.userId && actor.role === Role.ADMIN && entry.userId !== query.userId) return false;
      if (query.clientId && entry.clientId !== query.clientId) return false;
      return true;
    });

    const entries = filtered
      .slice()
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime())
      .map((entry) => hydrateDummyEntry(entry));

    return {
      entries,
      summary: buildSummary(entries)
    };
  }

  const where = {
    workDate: {
      gte: from,
      lte: to
    }
  };

  if (actor.role !== Role.ADMIN) {
    where.userId = actor.id;
  } else if (query.userId) {
    where.userId = query.userId;
  }

  if (query.clientId) {
    where.clientId = query.clientId;
  }

  const entries = await prisma.timesheetEntry.findMany({
    where,
    include: entryInclude,
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }]
  });

  return {
    entries,
    summary: buildSummary(entries)
  };
}

async function updateTimesheetEntry(id, payload, actor) {
  if (isDummyMode()) {
    const index = timesheetEntries.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new AppError("Timesheet entry not found.", 404);
    }

    const existing = timesheetEntries[index];
    if (actor.role !== Role.ADMIN && existing.userId !== actor.id) {
      throw new AppError("You are not allowed to update this timesheet entry.", 403);
    }

    const next = { ...existing };
    if (payload.workDate !== undefined) next.workDate = normalizeDate(payload.workDate);
    if (payload.durationMinutes !== undefined) next.durationMinutes = normalizeDuration(payload.durationMinutes);
    if (payload.description !== undefined) {
      const description = String(payload.description || "").trim();
      if (!description) throw new AppError("description cannot be empty.", 400);
      next.description = description;
    }
    if (payload.billable !== undefined) next.billable = Boolean(payload.billable);
    if (payload.clientId !== undefined) next.clientId = payload.clientId || null;
    if (payload.taskId !== undefined) next.taskId = payload.taskId || null;

    await validateReferences(next.clientId, next.taskId);
    next.updatedAt = new Date();
    timesheetEntries[index] = next;
    return hydrateDummyEntry(next);
  }

  const existing = await prisma.timesheetEntry.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new AppError("Timesheet entry not found.", 404);
  }
  if (actor.role !== Role.ADMIN && existing.userId !== actor.id) {
    throw new AppError("You are not allowed to update this timesheet entry.", 403);
  }

  const data = {};
  if (payload.workDate !== undefined) data.workDate = normalizeDate(payload.workDate);
  if (payload.durationMinutes !== undefined) data.durationMinutes = normalizeDuration(payload.durationMinutes);
  if (payload.description !== undefined) {
    const description = String(payload.description || "").trim();
    if (!description) throw new AppError("description cannot be empty.", 400);
    data.description = description;
  }
  if (payload.billable !== undefined) data.billable = Boolean(payload.billable);
  if (payload.clientId !== undefined) data.clientId = payload.clientId || null;
  if (payload.taskId !== undefined) data.taskId = payload.taskId || null;

  const nextClientId = data.clientId !== undefined ? data.clientId : existing.clientId;
  const nextTaskId = data.taskId !== undefined ? data.taskId : existing.taskId;
  await validateReferences(nextClientId, nextTaskId);

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields were provided for update.", 400);
  }

  return prisma.timesheetEntry.update({
    where: { id },
    data,
    include: entryInclude
  });
}

async function deleteTimesheetEntry(id, actor) {
  if (isDummyMode()) {
    const index = timesheetEntries.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new AppError("Timesheet entry not found.", 404);
    }
    if (actor.role !== Role.ADMIN && timesheetEntries[index].userId !== actor.id) {
      throw new AppError("You are not allowed to delete this timesheet entry.", 403);
    }
    timesheetEntries.splice(index, 1);
    return;
  }

  const existing = await prisma.timesheetEntry.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new AppError("Timesheet entry not found.", 404);
  }
  if (actor.role !== Role.ADMIN && existing.userId !== actor.id) {
    throw new AppError("You are not allowed to delete this timesheet entry.", 403);
  }

  await prisma.timesheetEntry.delete({
    where: { id }
  });
}

module.exports = {
  createTimesheetEntry,
  getTimesheetEntries,
  updateTimesheetEntry,
  deleteTimesheetEntry
};
