import { Router } from "express";
import { prisma } from "../lib/prisma";
import { cartCheckoutSchema } from "../lib/validators";
import { env } from "../config/env";
import {
  buildOrderEmailHtml,
  formatOrderEmailBody,
  sendOwnerEmail,
} from "../lib/mail";
import { authOptional, type AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
const ORDER_TTL_MS = 48 * 60 * 60 * 1000;

function emptyToNull(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

router.post("/checkout", authOptional, async (req: AuthRequest, res, next) => {
  try {
    const parsed = cartCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos del pedido inválidos" });
      return;
    }

    if (!env.ownerEmail) {
      res.status(503).json({
        error:
          "No pudimos recibir pedidos en este momento. Por favor usá el formulario de contacto.",
      });
      return;
    }

    const items = parsed.data.items;
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, name: true, stock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const outOfStock: string[] = [];

    for (const item of items) {
      const p = productMap.get(item.productId);
      if (!p) {
        res.status(400).json({ error: `Producto no encontrado: ${item.name}` });
        return;
      }
      if (p.stock < item.qty) {
        outOfStock.push(`${p.name} (disponible: ${p.stock}, solicitado: ${item.qty})`);
      }
    }

    if (outOfStock.length > 0) {
      res.status(400).json({ error: `Stock insuficiente:\n${outOfStock.join("\n")}` });
      return;
    }

    const session = req.sessionUser;
    const expiresAt = new Date(Date.now() + ORDER_TTL_MS);
    const guestName = emptyToNull(parsed.data.guestName);
    const guestEmail = emptyToNull(parsed.data.guestEmail);
    const guestPhone = emptyToNull(parsed.data.guestPhone);
    const guestAddress = emptyToNull(parsed.data.guestAddress);

    /** Stock: por ahora no se descuenta al crear el pedido (solo solicitud; contacto manual). */
    const order = await prisma.order.create({
      data: {
        userId: session?.sub ?? undefined,
        guestEmail,
        guestName,
        guestPhone,
        guestAddress,
        itemsJson: JSON.stringify(items),
        notes: parsed.data.notes || null,
        status: "PENDING",
        expiresAt,
      },
    });

    const customer = {
      name: guestName ?? session?.name?.trim() ?? "—",
      email: guestEmail ?? session?.email ?? "—",
      phone: guestPhone ?? "—",
      address: guestAddress ?? "—",
      registeredAccount: Boolean(session?.sub),
    };

    const meta = { orderId: order.id, expiresAt };
    await sendOwnerEmail({
      to: env.ownerEmail,
      subject: `Nuevo pedido web — ${order.id.slice(0, 8)}…`,
      text: formatOrderEmailBody(
        items.map((i) => ({ name: i.name, qty: i.qty })),
        parsed.data.notes,
        customer,
        meta,
      ),
      html: buildOrderEmailHtml(
        items.map((i) => ({ name: i.name, qty: i.qty })),
        parsed.data.notes,
        customer,
        meta,
      ),
    });

    res.json({ ok: true, orderId: order.id, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    next(e);
  }
});

export default router;
