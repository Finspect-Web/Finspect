const crypto = require("crypto");
const AppError = require("./appError");

function getEncryptionKey() {
  const secret = process.env.CREDENTIAL_SECRET;
  if (!secret) {
    throw new AppError("CREDENTIAL_SECRET is required for credential vault encryption.", 500);
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(value) {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return `${iv.toString("base64")}:${authTag}:${encrypted}`;
}

function decryptText(value) {
  const [ivBase64, authTagBase64, encrypted] = value.split(":");
  if (!ivBase64 || !authTagBase64 || !encrypted) {
    throw new AppError("Invalid encrypted credential payload.", 500);
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptText,
  decryptText
};
