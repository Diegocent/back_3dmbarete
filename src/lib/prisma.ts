/**
 * Cliente Prisma compartido.
 * Se usa solo cuando DATABASE_URL está definida (repositorios con BD real).
 * En desarrollo se reutiliza la instancia para evitar muchas conexiones con hot-reload.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
