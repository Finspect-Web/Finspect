const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const {
  clients,
  tasks,
  credentials,
  documents,
  invoices,
  payments,
  createId,
  findUserById
} = require("../utils/dummyStore");
const ActivityAction = require("../constants/activityActions");
const { logActivity } = require("./activity.service");

const clientInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
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
  _count: {
    select: {
      tasks: true,
      credentials: true,
      documents: true
    }
  }
};

function canAccessClient(client, actor) {
  return actor?.role === "ADMIN" || client.assignedToId === actor?.id;
}

async function createClient(payload, actorId) {
  const { name, email, phone, companyName, gstin, pan, address, notes, assignedToId } = payload;

  if (!name || !email || !phone || !companyName || !address) {
    throw new AppError("name, email, phone, companyName and address are required.", 400);
  }

  if (isDummyMode()) {
    const createdBy = findUserById(actorId);
    if (!createdBy) {
      throw new AppError("Created-by user not found.", 404);
    }
    const assignedTo = assignedToId ? findUserById(assignedToId) : null;
    if (assignedToId && !assignedTo) {
      throw new AppError("Assigned user not found.", 404);
    }
    if (assignedTo && assignedTo.role !== "STAFF") {
      throw new AppError("Assigned user must have STAFF role.", 400);
    }

    const client = {
      id: createId(),
      name,
      email,
      phone,
      companyName,
      gstin: gstin || null,
      pan: pan || null,
      address,
      notes: notes || null,
      createdById: actorId,
      assignedToId: assignedToId || null,
      createdAt: new Date()
    };
    clients.unshift(client);

    await logActivity(ActivityAction.CLIENT_CREATED, actorId, client.id);
    return {
      ...client,
      createdBy: {
        id: createdBy.id,
        name: createdBy.name,
        email: createdBy.email
      },
      assignedTo: assignedTo
        ? {
            id: assignedTo.id,
            name: assignedTo.name,
            email: assignedTo.email,
            role: assignedTo.role
          }
        : null,
      _count: {
        tasks: 0,
        credentials: 0
      }
    };
  }

  if (assignedToId) {
    const assignedTo = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignedTo) {
      throw new AppError("Assigned user not found.", 404);
    }
    if (assignedTo.role !== "STAFF") {
      throw new AppError("Assigned user must have STAFF role.", 400);
    }
  }

  const client = await prisma.client.create({
    data: {
      name,
      email,
      phone,
      companyName,
      gstin: gstin || null,
      pan: pan || null,
      address,
      notes: notes || null,
      createdById: actorId,
      assignedToId: assignedToId || null
    },
    include: clientInclude
  });

  await logActivity(ActivityAction.CLIENT_CREATED, actorId, client.id);
  return client;
}

async function getClients(actor) {
  if (isDummyMode()) {
    const visibleClients = actor?.role === "ADMIN" ? clients : clients.filter((client) => client.assignedToId === actor?.id);

    return visibleClients
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((client) => {
        const createdBy = findUserById(client.createdById);
        const assignedTo = client.assignedToId ? findUserById(client.assignedToId) : null;
        return {
          ...client,
          createdBy: createdBy
            ? {
                id: createdBy.id,
                name: createdBy.name,
                email: createdBy.email
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
          _count: {
            tasks: tasks.filter((item) => item.clientId === client.id).length,
            credentials: credentials.filter((item) => item.clientId === client.id).length,
            documents: documents.filter((item) => item.clientId === client.id).length
          }
        };
      });
  }

  const where = actor?.role === "ADMIN" ? {} : { assignedToId: actor?.id };

  return prisma.client.findMany({
    where,
    include: clientInclude,
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function getClientById(id, actor) {
  if (isDummyMode()) {
    const client = clients.find((item) => item.id === id);
    if (!client) {
      throw new AppError("Client not found.", 404);
    }

    if (!canAccessClient(client, actor)) {
      throw new AppError("You do not have access to this client.", 403);
    }

    const createdBy = findUserById(client.createdById);
    const assignedTo = client.assignedToId ? findUserById(client.assignedToId) : null;
    const clientDocuments = documents
      .filter((item) => item.clientId === client.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      ...client,
      createdBy: createdBy
        ? {
            id: createdBy.id,
            name: createdBy.name,
            email: createdBy.email
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
      _count: {
        tasks: tasks.filter((item) => item.clientId === client.id).length,
        credentials: credentials.filter((item) => item.clientId === client.id).length,
        documents: documents.filter((item) => item.clientId === client.id).length
      },
      tasks: tasks
        .filter((item) => item.clientId === client.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueDate: item.dueDate,
          status: item.status,
          priority: item.priority
        }))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      documents: clientDocuments.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        fileUrl: item.fileUrl,
        description: item.description,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        uploadedBy: item.uploadedById
          ? {
              id: item.uploadedById,
              name: findUserById(item.uploadedById)?.name || null,
              email: findUserById(item.uploadedById)?.email || null
            }
          : null
      }))
    };
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      ...clientInclude,
      tasks: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          priority: true
        },
        orderBy: {
          dueDate: "asc"
        }
      },
      documents: {
        select: {
          id: true,
          title: true,
          category: true,
          fileUrl: true,
          description: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!client) {
    throw new AppError("Client not found.", 404);
  }

  if (!canAccessClient(client, actor)) {
    throw new AppError("You do not have access to this client.", 403);
  }

  return client;
}

async function updateClient(id, payload, actorId) {
  if (isDummyMode()) {
    const clientIndex = clients.findIndex((item) => item.id === id);
    if (clientIndex === -1) {
      throw new AppError("Client not found.", 404);
    }

    const existing = clients[clientIndex];
    let nextAssignedToId = existing.assignedToId || null;
    if (payload.assignedToId !== undefined) {
      if (!payload.assignedToId) {
        nextAssignedToId = null;
      } else {
        const assignedTo = findUserById(payload.assignedToId);
        if (!assignedTo) {
          throw new AppError("Assigned user not found.", 404);
        }
        if (assignedTo.role !== "STAFF") {
          throw new AppError("Assigned user must have STAFF role.", 400);
        }
        nextAssignedToId = payload.assignedToId;
      }
    }

    const updated = {
      ...existing,
      name: payload.name ?? existing.name,
      email: payload.email ?? existing.email,
      phone: payload.phone ?? existing.phone,
      companyName: payload.companyName ?? existing.companyName,
      gstin: payload.gstin !== undefined ? payload.gstin || null : existing.gstin,
      pan: payload.pan !== undefined ? payload.pan || null : existing.pan,
      address: payload.address ?? existing.address,
      notes: payload.notes !== undefined ? payload.notes || null : existing.notes,
      assignedToId: nextAssignedToId
    };
    clients[clientIndex] = updated;

    await logActivity(ActivityAction.CLIENT_UPDATED, actorId, id);
    const createdBy = findUserById(updated.createdById);
    const assignedTo = updated.assignedToId ? findUserById(updated.assignedToId) : null;
    return {
      ...updated,
      createdBy: createdBy
        ? {
            id: createdBy.id,
            name: createdBy.name,
            email: createdBy.email
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
      _count: {
        tasks: tasks.filter((item) => item.clientId === updated.id).length,
        credentials: credentials.filter((item) => item.clientId === updated.id).length
      }
    };
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Client not found.", 404);
  }

  let nextAssignedToId = existing.assignedToId || null;
  if (payload.assignedToId !== undefined) {
    if (!payload.assignedToId) {
      nextAssignedToId = null;
    } else {
      const assignedTo = await prisma.user.findUnique({ where: { id: payload.assignedToId } });
      if (!assignedTo) {
        throw new AppError("Assigned user not found.", 404);
      }
      if (assignedTo.role !== "STAFF") {
        throw new AppError("Assigned user must have STAFF role.", 400);
      }
      nextAssignedToId = payload.assignedToId;
    }
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: payload.name ?? existing.name,
      email: payload.email ?? existing.email,
      phone: payload.phone ?? existing.phone,
      companyName: payload.companyName ?? existing.companyName,
      gstin: payload.gstin !== undefined ? payload.gstin || null : existing.gstin,
      pan: payload.pan !== undefined ? payload.pan || null : existing.pan,
      address: payload.address ?? existing.address,
      notes: payload.notes !== undefined ? payload.notes || null : existing.notes,
      assignedToId: nextAssignedToId
    },
    include: clientInclude
  });

  await logActivity(ActivityAction.CLIENT_UPDATED, actorId, client.id);
  return client;
}

async function deleteClient(id, actorId) {
  if (isDummyMode()) {
    const clientIndex = clients.findIndex((item) => item.id === id);
    if (clientIndex === -1) {
      throw new AppError("Client not found.", 404);
    }

    clients.splice(clientIndex, 1);

    for (let index = tasks.length - 1; index >= 0; index -= 1) {
      if (tasks[index].clientId === id) tasks.splice(index, 1);
    }
    for (let index = credentials.length - 1; index >= 0; index -= 1) {
      if (credentials[index].clientId === id) credentials.splice(index, 1);
    }
    for (let index = documents.length - 1; index >= 0; index -= 1) {
      if (documents[index].clientId === id) documents.splice(index, 1);
    }
    for (let index = invoices.length - 1; index >= 0; index -= 1) {
      const invoice = invoices[index];
      if (invoice.clientId === id) {
        for (let paymentIndex = payments.length - 1; paymentIndex >= 0; paymentIndex -= 1) {
          if (payments[paymentIndex].invoiceId === invoice.id) payments.splice(paymentIndex, 1);
        }
        invoices.splice(index, 1);
      }
    }

    await logActivity(ActivityAction.CLIENT_DELETED, actorId, id);
    return;
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Client not found.", 404);
  }

  await prisma.client.delete({ where: { id } });
  await logActivity(ActivityAction.CLIENT_DELETED, actorId, id);
}

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
};
