const prisma = require("../prisma/client");
const { isDummyMode } = require("../utils/mode");
const { clients, credentials, documents } = require("../utils/dummyStore");

function normalizeQuery(query) {
  return String(query || "").trim();
}

function hasClientAccess(client, actor) {
  if (!actor) {
    return true;
  }

  return actor?.role === "ADMIN" || client.assignedToId === actor?.id;
}

function mapClient(client) {
  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    assignedTo: client.assignedTo
      ? {
          id: client.assignedTo.id,
          name: client.assignedTo.name,
          email: client.assignedTo.email
        }
      : client.assignedToId
        ? { id: client.assignedToId }
        : null
  };
}

function mapPassword(credential, client) {
  return {
    id: credential.id,
    type: credential.serviceName,
    username: credential.username,
    client: {
      id: client.id,
      name: client.name,
      companyName: client.companyName
    }
  };
}

function mapDocument(document, client) {
  return {
    id: document.id,
    name: document.title,
    title: document.title,
    fileUrl: document.fileUrl,
    client: {
      id: client.id,
      name: client.name,
      companyName: client.companyName
    }
  };
}

async function searchGlobal(query, actor) {
  const term = normalizeQuery(query);
  const loweredTerm = term.toLowerCase();
  console.log("Search query:", term);

  if (term.length < 2) {
    return {
      clients: [],
      passwords: [],
      documents: []
    };
  }

  if (isDummyMode()) {
    const clientMatches = clients.filter((client) => {
      if (!hasClientAccess(client, actor)) {
        return false;
      }

      return [client.name, client.companyName].some((value) => String(value || "").toLowerCase().includes(loweredTerm));
    });

    const passwordMatches = credentials
      .filter((credential) => {
        const client = clients.find((item) => item.id === credential.clientId);
        if (!client || !hasClientAccess(client, actor)) {
          return false;
        }

        return [credential.serviceName, credential.username].some((value) =>
          String(value || "").toLowerCase().includes(loweredTerm)
        );
      })
      .map((credential) => {
        const client = clients.find((item) => item.id === credential.clientId);
        return mapPassword(credential, client);
      });

    const documentMatches = documents
      .filter((document) => {
        const client = clients.find((item) => item.id === document.clientId);
        if (!client || !hasClientAccess(client, actor)) {
          return false;
        }

        return String(document.title || "").toLowerCase().includes(loweredTerm);
      })
      .map((document) => {
        const client = clients.find((item) => item.id === document.clientId);
        return mapDocument(document, client);
      });

    console.log("Results:", clientMatches);

    return {
      clients: clientMatches.map(mapClient),
      passwords: passwordMatches,
      documents: documentMatches
    };
  }

  const clientWhere = {
    OR: [
      {
        name: {
          contains: term,
          mode: "insensitive"
        }
      },
      {
        companyName: {
          contains: term,
          mode: "insensitive"
        }
      }
    ]
  };

  if (actor?.role === "STAFF") {
    clientWhere.assignedToId = actor.id;
  }

  const credentialWhere = {
    OR: [
      {
        serviceName: {
          contains: term,
          mode: "insensitive"
        }
      },
      {
        username: {
          contains: term,
          mode: "insensitive"
        }
      }
    ]
  };

  if (actor?.role === "STAFF") {
    credentialWhere.client = {
      assignedToId: actor.id
    };
  }

  const documentWhere = {
    title: {
      contains: term,
      mode: "insensitive"
    }
  };

  if (actor?.role === "STAFF") {
    documentWhere.client = {
      assignedToId: actor.id
    };
  }

  const [clientResults, passwordResults, documentResults] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      select: {
        id: true,
        name: true,
        companyName: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.credential.findMany({
      where: credentialWhere,
      select: {
        id: true,
        serviceName: true,
        username: true,
        client: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.document.findMany({
      where: documentWhere,
      select: {
        id: true,
        title: true,
        fileUrl: true,
        client: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    })
  ]);

  console.log("Results:", clientResults);

  return {
    clients: clientResults.map(mapClient),
    passwords: passwordResults.map((credential) => ({
      id: credential.id,
      type: credential.serviceName,
      username: credential.username,
      client: credential.client
    })),
    documents: documentResults.map((document) => ({
      id: document.id,
      name: document.title,
      title: document.title,
      fileUrl: document.fileUrl,
      client: document.client
    }))
  };
}

module.exports = {
  searchGlobal
};