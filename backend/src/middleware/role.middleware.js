const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { clients } = require("../utils/dummyStore");

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required before role check.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You are not authorized to perform this action.", 403));
    }

    return next();
  };
}

const authorize = checkRole;

async function checkClientAccess(req, res, next) {
  if (!req.user) {
    return next(new AppError("Authentication required before client access check.", 401));
  }

  if (req.user.role === "ADMIN") {
    return next();
  }

  const clientId = req.params.clientId || req.params.id || req.body.clientId;
  if (!clientId) {
    return next(new AppError("Client id is required.", 400));
  }

  if (isDummyMode()) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      return next(new AppError("Client not found.", 404));
    }

    if (client.assignedToId !== req.user.id) {
      return next(new AppError("You do not have access to this client.", 403));
    }

    return next();
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      assignedToId: true
    }
  });

  if (!client) {
    return next(new AppError("Client not found.", 404));
  }

  if (client.assignedToId !== req.user.id) {
    return next(new AppError("You do not have access to this client.", 403));
  }

  return next();
}

module.exports = {
  authorize,
  checkRole,
  checkClientAccess
};
