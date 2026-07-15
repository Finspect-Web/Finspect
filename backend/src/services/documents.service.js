const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const ActivityAction = require("../constants/activityActions");
const { isDummyMode } = require("../utils/mode");
const { clients, documents, createId, findUserById } = require("../utils/dummyStore");
const { logActivity } = require("./activity.service");

function canAccessClient(client, actor) {
  return actor?.role === "ADMIN" || client.assignedToId === actor?.id;
}

function toDocumentResponse(document) {
  const uploadedBy = document.uploadedBy || (document.uploadedById ? findUserById(document.uploadedById) : null);

  return {
    ...document,
    uploadedBy: uploadedBy
      ? {
          id: uploadedBy.id,
          name: uploadedBy.name,
          email: uploadedBy.email
        }
      : null
  };
}

async function createDocument(payload, actorId) {
  const { clientId, title, category = "OTHER", fileUrl, description, expiresAt } = payload;

  if (!clientId || !title || !fileUrl) {
    throw new AppError("clientId, title and fileUrl are required.", 400);
  }

  if (isDummyMode()) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      throw new AppError("Client not found.", 404);
    }

    const document = {
      id: createId(),
      clientId,
      title,
      category,
      fileUrl,
      description: description || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      uploadedById: actorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    documents.unshift(document);
    await logActivity(ActivityAction.DOCUMENT_CREATED, actorId, document.id);
    return toDocumentResponse({
      ...document,
      uploadedBy: findUserById(actorId)
    });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true }
  });

  if (!client) {
    throw new AppError("Client not found.", 404);
  }

  const document = await prisma.document.create({
    data: {
      clientId,
      title,
      category,
      fileUrl,
      description: description || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      uploadedById: actorId
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  await logActivity(ActivityAction.DOCUMENT_CREATED, actorId, document.id);
  return toDocumentResponse(document);
}

async function getDocumentById(documentId, actor) {
  if (isDummyMode()) {
    const document = documents.find((item) => item.id === documentId);

    if (!document) {
      throw new AppError("Document not found.", 404);
    }

    const client = clients.find((item) => item.id === document.clientId);

    if (!client) {
      throw new AppError("Client not found.", 404);
    }

    if (!canAccessClient(client, actor)) {
      throw new AppError("You do not have access to this client.", 403);
    }

    return toDocumentResponse({
      ...document,
      uploadedBy: document.uploadedById ? findUserById(document.uploadedById) : null
    });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      client: {
        select: {
          id: true,
          assignedToId: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!document) {
    throw new AppError("Document not found.", 404);
  }

  if (!canAccessClient(document.client, actor)) {
    throw new AppError("You do not have access to this client.", 403);
  }

  return toDocumentResponse(document);
}

async function getDocumentsByClient(clientId, actor) {
  if (isDummyMode()) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      throw new AppError("Client not found.", 404);
    }

    if (!canAccessClient(client, actor)) {
      throw new AppError("You do not have access to this client.", 403);
    }

    return documents
      .filter((item) => item.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((document) => toDocumentResponse(document));
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      assignedToId: true
    }
  });

  if (!client) {
    throw new AppError("Client not found.", 404);
  }

  if (!canAccessClient(client, actor)) {
    throw new AppError("You do not have access to this client.", 403);
  }

  const clientDocuments = await prisma.document.findMany({
    where: { clientId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return clientDocuments.map((document) => toDocumentResponse(document));
}

async function deleteDocument(documentId, actorId, actor) {
  if (isDummyMode()) {
    const index = documents.findIndex((item) => item.id === documentId);

    if (index === -1) {
      throw new AppError("Document not found.", 404);
    }

    const document = documents[index];
    const client = clients.find((item) => item.id === document.clientId);

    if (!client) {
      throw new AppError("Client not found.", 404);
    }

    if (!canAccessClient(client, actor)) {
      throw new AppError("You do not have access to this client.", 403);
    }

    documents.splice(index, 1);
    await logActivity(ActivityAction.DOCUMENT_DELETED, actorId, document.id);
    return { id: document.id };
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      client: {
        select: {
          id: true,
          assignedToId: true
        }
      }
    }
  });

  if (!document) {
    throw new AppError("Document not found.", 404);
  }

  if (!canAccessClient(document.client, actor)) {
    throw new AppError("You do not have access to this client.", 403);
  }

  await prisma.document.delete({
    where: { id: documentId }
  });

  await logActivity(ActivityAction.DOCUMENT_DELETED, actorId, document.id);
  return { id: document.id };
}

module.exports = {
  createDocument,
  getDocumentById,
  getDocumentsByClient,
  deleteDocument
};