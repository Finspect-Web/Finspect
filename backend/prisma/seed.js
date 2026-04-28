require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Finspect Admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required for seeding.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed admin already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: Role.ADMIN
    }
  });

  console.log("Seed admin created successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
