const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const ActivityAction = require("../constants/activityActions");
const { isDummyMode } = require("../utils/mode");
const { credentials, clients, tasks, createId } = require("../utils/dummyStore");
const { encryptText, decryptText } = require("../utils/crypto");
const { logActivity } = require("./activity.service");

const credentialInclude = {
  client: {
    select: {
      id: true,
      name: true,
      companyName: true
    }
  }
};

async function createCredential(payload, actorId) {
  const { clientId, serviceName, username, password, notes } = payload;
  if (!clientId || !serviceName || !username || !password) {
    throw new AppError("clientId, serviceName, username and password are required.", 400);
  }

  if (isDummyMode()) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) throw new AppError("Client not found.", 404);

    const credential = {
      id: createId(),
      clientId,
      serviceName,
      username,
      password,
      notes: notes || null,
      createdAt: new Date()
    };
    credentials.unshift(credential);
    await logActivity(ActivityAction.CREDENTIAL_CREATED, actorId, credential.id);
    return {
      ...credential,
      client: {
        id: client.id,
        name: client.name,
        companyName: client.companyName
      }
    };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new AppError("Client not found.", 404);
  }

  const credential = await prisma.credential.create({
    data: {
      clientId,
      serviceName,
      username,
      password: encryptText(password),
      notes: notes || null
    },
    include: credentialInclude
  });

  await logActivity(ActivityAction.CREDENTIAL_CREATED, actorId, credential.id);
  return {
    ...credential,
    password
  };
}

async function assertCredentialReadAccess(clientId, actor) {
  if (actor.role === "ADMIN") {
    return;
  }

  if (isDummyMode()) {
    const hasAssignedTask = tasks.some((item) => item.clientId === clientId && item.assignedToId === actor.id);
    if (!hasAssignedTask) {
      throw new AppError("You can view credentials only for clients assigned to you through tasks.", 403);
    }
    return;
  }

  const hasAssignedTask = await prisma.task.findFirst({
    where: {
      clientId,
      assignedToId: actor.id
    },
    select: {
      id: true
    }
  });

  if (!hasAssignedTask) {
    throw new AppError("You can view credentials only for clients assigned to you through tasks.", 403);
  }
}

async function getCredentialsByClient(clientId, actor) {
  if (isDummyMode()) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) throw new AppError("Client not found.", 404);
    await assertCredentialReadAccess(clientId, actor);

    return credentials
      .filter((item) => item.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        ...item,
        client: {
          id: client.id,
          name: client.name,
          companyName: client.companyName
        }
      }));
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new AppError("Client not found.", 404);
  }
  await assertCredentialReadAccess(clientId, actor);

  const dbCredentials = await prisma.credential.findMany({
    where: { clientId },
    include: credentialInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return dbCredentials.map((credential) => ({
    ...credential,
    password: decryptText(credential.password)
  }));
}

async function updateCredential(id, payload, actorId) {
  if (isDummyMode()) {
    const credentialIndex = credentials.findIndex((item) => item.id === id);
    if (credentialIndex === -1) throw new AppError("Credential not found.", 404);

    const existing = credentials[credentialIndex];
    const updated = { ...existing };
    if (payload.serviceName !== undefined) updated.serviceName = payload.serviceName;
    if (payload.username !== undefined) updated.username = payload.username;
    if (payload.password !== undefined) updated.password = payload.password;
    if (payload.notes !== undefined) updated.notes = payload.notes || null;

    if (
      payload.serviceName === undefined &&
      payload.username === undefined &&
      payload.password === undefined &&
      payload.notes === undefined
    ) {
      throw new AppError("No valid fields were provided for update.", 400);
    }

    credentials[credentialIndex] = updated;
    await logActivity(ActivityAction.CREDENTIAL_UPDATED, actorId, id);

    const client = clients.find((item) => item.id === updated.clientId);
    return {
      ...updated,
      client: client
        ? {
            id: client.id,
            name: client.name,
            companyName: client.companyName
          }
        : null
    };
  }

  const existing = await prisma.credential.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Credential not found.", 404);
  }

  const data = {};
  if (payload.serviceName !== undefined) data.serviceName = payload.serviceName;
  if (payload.username !== undefined) data.username = payload.username;
  if (payload.password !== undefined) data.password = encryptText(payload.password);
  if (payload.notes !== undefined) data.notes = payload.notes || null;

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields were provided for update.", 400);
  }

  const credential = await prisma.credential.update({
    where: { id },
    data,
    include: credentialInclude
  });

  await logActivity(ActivityAction.CREDENTIAL_UPDATED, actorId, id);

  return {
    ...credential,
    password: payload.password !== undefined ? payload.password : decryptText(credential.password)
  };
}

async function deleteCredential(id, actorId) {
  if (isDummyMode()) {
    const credentialIndex = credentials.findIndex((item) => item.id === id);
    if (credentialIndex === -1) throw new AppError("Credential not found.", 404);
    credentials.splice(credentialIndex, 1);
    await logActivity(ActivityAction.CREDENTIAL_DELETED, actorId, id);
    return;
  }

  const existing = await prisma.credential.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Credential not found.", 404);
  }

  await prisma.credential.delete({ where: { id } });
  await logActivity(ActivityAction.CREDENTIAL_DELETED, actorId, id);
}

module.exports = {
  createCredential,
  getCredentialsByClient,
  updateCredential,
  deleteCredential
};
