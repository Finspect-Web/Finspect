const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { verifyToken } = require("../utils/jwt");
const { isDummyMode } = require("../utils/mode");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError("Authentication token is required.", 401));
  }

  try {
    const decoded = verifyToken(token);

    if (isDummyMode()) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || "Dummy User"
      };
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true, isActive: true }
    });

    if (!user) {
      return next(new AppError("User not found for provided token.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account has been disabled. Please contact administrator.", 403));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired token.", 401));
  }
}

module.exports = {
  authenticate
};
