/**
 * One-time admin password reset script.
 *
 * Usage:
 *   node scripts/reset-admin-password.js
 *
 * This will reset the admin user's password to "Admin@123"
 * regardless of what is currently stored in the database.
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const NEW_PASSWORD = "Admin@123";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.error("❌ SEED_ADMIN_EMAIL environment variable is not set.");
    process.exit(1);
  }

  console.log(`🔍 Looking up admin user: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(NEW_PASSWORD, 12);

  await prisma.user.update({
    where: { email },
    data: { password: hash }
  });

  // Verify the new hash works
  const updated = await prisma.user.findUnique({
    where: { email },
    select: { password: true }
  });

  const verify = await bcrypt.compare(NEW_PASSWORD, updated.password);
  if (!verify) {
    console.error("❌ Password update failed — newly hashed password does not match.");
    process.exit(1);
  }

  console.log(`✅ Admin password reset successfully.`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${NEW_PASSWORD}`);
  console.log(`   ⚠️  Change this password after first login.`);
}

main()
  .catch((err) => {
    console.error("❌ Reset failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
