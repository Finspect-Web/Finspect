const jwt = require("jsonwebtoken");
const { isDummyMode } = require("./mode");

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (isDummyMode() || process.env.NODE_ENV !== "production") {
    return "finspect-dev-jwt-secret";
  }

  throw new Error("JWT_SECRET is required.");
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signToken,
  verifyToken
};
