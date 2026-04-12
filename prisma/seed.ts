import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@3dmbarete.local";
  const adminPass = process.env.ADMIN_SEED_PASSWORD ?? "admin1234";
  const hash = await bcrypt.hash(adminPass, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash: hash, name: "Administrador", role: "ADMIN" },
    update: { passwordHash: hash, role: "ADMIN" },
  });

  console.log(`Seed OK: administrador ${adminEmail}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
