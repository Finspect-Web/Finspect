const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { logActivity } = require("./activity.service");
const ActivityAction = require("../constants/activityActions");
const { compliances, clients, users, createId, findUserById } = require("../utils/dummyStore");

const Role = prismaTypes.Role || { ADMIN: "ADMIN", STAFF: "STAFF" };
const defaultComplianceTypes = {
  GST: "GST",
  TDS: "TDS",
  ROC: "ROC",
  INCOME_TAX: "INCOME_TAX",
  OTHER: "OTHER"
};
const ComplianceType = prismaTypes.ComplianceType || defaultComplianceTypes;
const ComplianceStatus = prismaTypes.ComplianceStatus || {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE"
};
const RecurrenceType = prismaTypes.RecurrenceType || {
  NONE: "NONE",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY"
};

const ACTION_COMPLIANCE_CREATED = ActivityAction.COMPLIANCE_CREATED || "COMPLIANCE_CREATED";
const ACTION_COMPLIANCE_UPDATED = ActivityAction.COMPLIANCE_UPDATED || "COMPLIANCE_UPDATED";
const ACTION_COMPLIANCE_COMPLETED = ActivityAction.COMPLIANCE_COMPLETED || "COMPLIANCE_COMPLETED";
const DEFAULT_COMPLIANCE_TYPES = Object.values(defaultComplianceTypes);

const complianceInclude = {
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
      email: true,
      role: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
};

function normalizeComplianceType(type) {
  const value = String(type || "").trim();
  if (!value) return value;

  const normalized = value.toUpperCase().replace(/\s+/g, "_");
  if (DEFAULT_COMPLIANCE_TYPES.includes(normalized)) {
    return normalized;
  }

  return value;
}

async function getAllowedComplianceTypes() {
  const allowed = new Set([...Object.values(ComplianceType), ...DEFAULT_COMPLIANCE_TYPES]);
  if (isDummyMode()) return allowed;

  const dbTypes = await prisma.complianceType.findMany({
    select: { name: true }
  });

  for (const entry of dbTypes) {
    const name = String(entry.name || "").trim();
    if (!name) continue;
    allowed.add(name);
    const normalized = normalizeComplianceType(name);
    if (normalized) {
      allowed.add(normalized);
    }
  }

  return allowed;
}

async function validateComplianceType(type) {
  if (type === undefined) return type;

  const normalizedType = normalizeComplianceType(type);
  const allowedTypes = await getAllowedComplianceTypes();
  if (!allowedTypes.has(normalizedType)) {
    throw new AppError("Invalid compliance type.", 400);
  }

  return normalizedType;
}

function validateComplianceStatus(status) {
  if (status !== undefined && !Object.values(ComplianceStatus).includes(status)) {
    throw new AppError("Invalid compliance status.", 400);
  }
}

function validateRecurrence(recurrence) {
  if (recurrence !== undefined && !Object.values(RecurrenceType).includes(recurrence)) {
    throw new AppError("Invalid recurrence type.", 400);
  }
}

function parseDate(value, fieldName) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid date.`, 400);
  }
  return parsed;
}

function getNextDueDate(dueDate, recurrence) {
  const baseDate = parseDate(dueDate, "dueDate");
  const nextDate = new Date(baseDate);

  if (recurrence === RecurrenceType.MONTHLY) {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    return nextDate;
  }

  if (recurrence === RecurrenceType.QUARTERLY) {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
    return nextDate;
  }

  if (recurrence === RecurrenceType.YEARLY) {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
    return nextDate;
  }

  return nextDate;
}

function applyRecurringCompletion(existing, data) {
  const effectiveStatus = data.status;
  if (effectiveStatus !== ComplianceStatus.COMPLETED || existing.status === ComplianceStatus.COMPLETED) {
    return false;
  }

  const effectiveRecurrence = data.recurrence ?? existing.recurrence;
  if (effectiveRecurrence === RecurrenceType.NONE) {
    return true;
  }

  const baseDueDate = data.dueDate ?? existing.dueDate;
  data.dueDate = getNextDueDate(baseDueDate, effectiveRecurrence);
  data.status = ComplianceStatus.PENDING;
  return true;
}

function hydrateDummyCompliance(item) {
  const client = clients.find((entry) => entry.id === item.clientId);
  const assignedTo = findUserById(item.assignedToId);
  const createdBy = findUserById(item.createdById);

  return {
    ...item,
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
          name: assignedTo.name,
          email: assignedTo.email,
          role: assignedTo.role
        }
      : null,
    createdBy: createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          email: createdBy.email
        }
      : null
  };
}

async function createCompliance(payload, actorId) {
  const { clientId, title, description, type = ComplianceType.OTHER, dueDate, recurrence = RecurrenceType.NONE, assignedToId } = payload;

  if (!clientId || !title || !dueDate || !assignedToId) {
    throw new AppError("clientId, title, dueDate and assignedToId are required.", 400);
  }

  const normalizedType = await validateComplianceType(type);
  validateRecurrence(recurrence);
  const parsedDueDate = parseDate(dueDate, "dueDate");

  if (isDummyMode()) {
    const client = clients.find((entry) => entry.id === clientId);
    const assignedUser = users.find((entry) => entry.id === assignedToId);
    const createdBy = findUserById(actorId);

    if (!client) throw new AppError("Client not found.", 404);
    if (!assignedUser) throw new AppError("Assigned user not found.", 404);
    if (!createdBy) throw new AppError("Created-by user not found.", 404);

    const compliance = {
      id: createId(),
      clientId,
      title,
      description: description || null,
      type: normalizedType,
      dueDate: parsedDueDate,
      recurrence,
      status: ComplianceStatus.PENDING,
      assignedToId,
      createdById: actorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    compliances.unshift(compliance);
    await logActivity(ACTION_COMPLIANCE_CREATED, actorId, compliance.id);
    return hydrateDummyCompliance(compliance);
  }

  const [client, assignedUser] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.user.findUnique({ where: { id: assignedToId } })
  ]);

  if (!client) throw new AppError("Client not found.", 404);
  if (!assignedUser) throw new AppError("Assigned user not found.", 404);

  const compliance = await prisma.complianceItem.create({
    data: {
      clientId,
      title,
      description: description || null,
      type: normalizedType,
      dueDate: parsedDueDate,
      recurrence,
      assignedToId,
      createdById: actorId
    },
    include: complianceInclude
  });

  await logActivity(ACTION_COMPLIANCE_CREATED, actorId, compliance.id);
  return compliance;
}

async function getCompliances(actor) {
  if (isDummyMode()) {
    const filtered = actor.role === Role.ADMIN ? compliances : compliances.filter((entry) => entry.assignedToId === actor.id);
    return filtered
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map((item) => hydrateDummyCompliance(item));
  }

  const where = actor.role === Role.ADMIN ? {} : { assignedToId: actor.id };
  return prisma.complianceItem.findMany({
    where,
    include: complianceInclude,
    orderBy: {
      dueDate: "asc"
    }
  });
}

async function getComplianceById(id, actor) {
  if (isDummyMode()) {
    const compliance = compliances.find((entry) => entry.id === id);
    if (!compliance) throw new AppError("Compliance item not found.", 404);
    if (actor.role !== Role.ADMIN && compliance.assignedToId !== actor.id) {
      throw new AppError("You are not allowed to view this compliance item.", 403);
    }
    return hydrateDummyCompliance(compliance);
  }

  const compliance = await prisma.complianceItem.findUnique({
    where: { id },
    include: complianceInclude
  });
  if (!compliance) throw new AppError("Compliance item not found.", 404);
  if (actor.role !== Role.ADMIN && compliance.assignedToId !== actor.id) {
    throw new AppError("You are not allowed to view this compliance item.", 403);
  }
  return compliance;
}

async function updateCompliance(id, payload, actor) {
  if (isDummyMode()) {
    const index = compliances.findIndex((entry) => entry.id === id);
    if (index === -1) throw new AppError("Compliance item not found.", 404);

    const existing = compliances[index];
    if (actor.role !== Role.ADMIN && existing.assignedToId !== actor.id) {
      throw new AppError("You are not allowed to update this compliance item.", 403);
    }

    const data = {};
    if (actor.role === Role.STAFF) {
      if (payload.status === undefined) {
        throw new AppError("Staff can only update compliance status.", 400);
      }
      validateComplianceStatus(payload.status);
      data.status = payload.status;
    } else {
      if (payload.title !== undefined) data.title = payload.title;
      if (payload.description !== undefined) data.description = payload.description || null;
      if (payload.type !== undefined) {
        data.type = await validateComplianceType(payload.type);
      }
      if (payload.dueDate !== undefined) data.dueDate = parseDate(payload.dueDate, "dueDate");
      if (payload.recurrence !== undefined) {
        validateRecurrence(payload.recurrence);
        data.recurrence = payload.recurrence;
      }
      if (payload.assignedToId !== undefined) {
        const assignedUser = users.find((entry) => entry.id === payload.assignedToId);
        if (!assignedUser) throw new AppError("Assigned user not found.", 404);
        data.assignedToId = payload.assignedToId;
      }
      if (payload.status !== undefined) {
        validateComplianceStatus(payload.status);
        data.status = payload.status;
      }
    }

    const completionOccurred = applyRecurringCompletion(existing, data);

    if (Object.keys(data).length === 0) {
      throw new AppError("No valid fields were provided for update.", 400);
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    compliances[index] = updated;

    await logActivity(completionOccurred ? ACTION_COMPLIANCE_COMPLETED : ACTION_COMPLIANCE_UPDATED, actor.id, id);
    return hydrateDummyCompliance(updated);
  }

  const existing = await prisma.complianceItem.findUnique({ where: { id } });
  if (!existing) throw new AppError("Compliance item not found.", 404);

  if (actor.role !== Role.ADMIN && existing.assignedToId !== actor.id) {
    throw new AppError("You are not allowed to update this compliance item.", 403);
  }

  const data = {};
  if (actor.role === Role.STAFF) {
    if (payload.status === undefined) {
      throw new AppError("Staff can only update compliance status.", 400);
    }
    validateComplianceStatus(payload.status);
    data.status = payload.status;
  } else {
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = payload.description || null;
    if (payload.type !== undefined) {
      data.type = await validateComplianceType(payload.type);
    }
    if (payload.dueDate !== undefined) data.dueDate = parseDate(payload.dueDate, "dueDate");
    if (payload.recurrence !== undefined) {
      validateRecurrence(payload.recurrence);
      data.recurrence = payload.recurrence;
    }
    if (payload.assignedToId !== undefined) {
      const assignedUser = await prisma.user.findUnique({ where: { id: payload.assignedToId } });
      if (!assignedUser) throw new AppError("Assigned user not found.", 404);
      data.assignedToId = payload.assignedToId;
    }
    if (payload.status !== undefined) {
      validateComplianceStatus(payload.status);
      data.status = payload.status;
    }
  }

  const completionOccurred = applyRecurringCompletion(existing, data);

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields were provided for update.", 400);
  }

  const compliance = await prisma.complianceItem.update({
    where: { id },
    data,
    include: complianceInclude
  });

  await logActivity(completionOccurred ? ACTION_COMPLIANCE_COMPLETED : ACTION_COMPLIANCE_UPDATED, actor.id, id);
  return compliance;
}

async function deleteCompliance(id, actorId) {
  if (isDummyMode()) {
    const index = compliances.findIndex((entry) => entry.id === id);
    if (index === -1) throw new AppError("Compliance item not found.", 404);
    compliances.splice(index, 1);
    await logActivity(ACTION_COMPLIANCE_UPDATED, actorId, id);
    return;
  }

  const existing = await prisma.complianceItem.findUnique({ where: { id } });
  if (!existing) throw new AppError("Compliance item not found.", 404);

  await prisma.complianceItem.delete({ where: { id } });
  await logActivity(ACTION_COMPLIANCE_UPDATED, actorId, id);
}

module.exports = {
  createCompliance,
  getCompliances,
  getComplianceById,
  updateCompliance,
  deleteCompliance
};
