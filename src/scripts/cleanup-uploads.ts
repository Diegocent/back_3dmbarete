/**
 * Proceso independiente: borra archivos en storage/uploads que no están referenciados en BD.
 * Invocado por supercronic según `crontab` en la raíz de `back/`.
 */
import { config as loadDotenv } from "dotenv";

loadDotenv();

void (async () => {
  const logger = (await import("../config/logger")).default;
  const { prisma } = await import("../lib/prisma");
  try {
    const { cleanupOrphanUploadFiles } = await import("../lib/upload-storage");
    const r = await cleanupOrphanUploadFiles();
    logger.info(`cleanup-uploads (script): ${JSON.stringify(r)}`);
  } catch (e) {
    logger.error("cleanup-uploads (script): fallo", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
  process.exit(process.exitCode ?? 0);
})();
