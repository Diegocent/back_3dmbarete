import { Router } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import logger from "../config/logger";
import { cleanupOrphanUploadFiles } from "../lib/upload-storage";

const router = Router();

function parseOrderItems(itemsJson: string): { productId: string; qty: number }[] | null {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: { productId: string; qty: number }[] = [];
    for (const row of parsed) {
      if (
        row &&
        typeof row === "object" &&
        "productId" in row &&
        "qty" in row &&
        typeof (row as { productId: unknown }).productId === "string" &&
        typeof (row as { qty: unknown }).qty === "number"
      ) {
        out.push({ productId: (row as { productId: string }).productId, qty: (row as { qty: number }).qty });
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

router.post("/orders/expire", async (req, res, next) => {
  try {
    const secret = req.headers["x-cron-secret"];
    const headerSecret = typeof secret === "string" ? secret : Array.isArray(secret) ? secret[0] : "";
    if (env.cronSecret && headerSecret !== env.cronSecret) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const now = new Date();
    const expired = await prisma.order.findMany({
      where: { status: "PENDING", expiresAt: { lte: now } },
      select: { id: true, itemsJson: true },
    });

    let restored = 0;
    for (const order of expired) {
      try {
        const items = parseOrderItems(order.itemsJson);
        if (!items) {
          logger.warn(`orders/expire: pedido ${order.id} con itemsJson inválido; se marca EXPIRED sin devolver stock`);
          await prisma.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
          continue;
        }
        await prisma.$transaction(async (tx) => {
          for (const item of items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            });
          }
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });
        });
        restored += items.reduce((a, i) => a + i.qty, 0);
      } catch (e) {
        logger.warn(`orders/expire: error procesando ${order.id}, se intenta solo marcar EXPIRED`, e);
        try {
          await prisma.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
        } catch {
          /* ignore */
        }
      }
    }

    res.json({
      ok: true,
      expiredOrders: expired.length,
      restoredItems: restored,
    });
  } catch (e) {
    next(e);
  }
});

/** Limpieza de archivos en disco no referenciados en BD (cron diario, mismo header que orders/expire). */
router.post("/maintenance/cleanup-uploads", async (req, res, next) => {
  try {
    const secret = req.headers["x-cron-secret"];
    const headerSecret = typeof secret === "string" ? secret : Array.isArray(secret) ? secret[0] : "";
    if (env.cronSecret && headerSecret !== env.cronSecret) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const report = await cleanupOrphanUploadFiles();
    res.json({ ok: true, ...report });
  } catch (e) {
    next(e);
  }
});

export default router;
