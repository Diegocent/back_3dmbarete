/**
 * Comprueba conexión Prisma → MySQL y cuenta filas básicas.
 * Uso: npm run db:verify
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL no está definida.");
    process.exit(1);
  }
  await prisma.$queryRaw`SELECT 1`;
  const [users, products, partners, orders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.partnerCompany.count(),
    prisma.order.count(),
  ]);
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  console.log(
    JSON.stringify(
      { ok: true, users, admins, products, partners, orders },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
