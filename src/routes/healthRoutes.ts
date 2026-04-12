import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/** Sin consulta a BD (smoke / balanceadores). */
router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "3d-mbarete-api" });
});

router.get("/health/database", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const adminUsers = await prisma.user.count({ where: { role: "ADMIN" } });
    res.json({ ok: true, adminUsers });
  } catch (e) {
    next(e);
  }
});

export default router;
