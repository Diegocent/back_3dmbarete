import { Router } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  productFormSchema,
  partnerCompanyFormSchema,
} from "../lib/validators";
import { LOYALTY_CODE_VALIDITY_DAYS } from "../lib/constants";
import { authRequired, requireAdmin } from "../middlewares/authMiddleware";
import {
  collectUploadPathsFromPartner,
  collectUploadPathsFromProduct,
  deleteUploadFilesIfUnreferenced,
} from "../lib/upload-storage";

const router = Router();

router.use(authRequired, requireAdmin);

const UPLOAD_SPECS = /^\/uploads\/products\/[A-Za-z0-9._-]+$/;

function normalizeSpecsUrl(url: string | undefined) {
  const t = url?.trim();
  if (!t) return null;
  if (UPLOAD_SPECS.test(t)) return t;
  try {
    return new URL(t).toString();
  } catch {
    return null;
  }
}

function normalizeOptional(s: string | undefined) {
  const t = s?.trim();
  return t ? t : null;
}

router.get("/admin/products", async (req, res, next) => {
  try {
    const rows = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ products: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/admin/products", async (req, res, next) => {
  try {
    const parsed = productFormSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const specs = normalizeSpecsUrl(parsed.data.specsFileUrl);
    if (parsed.data.specsFileUrl && parsed.data.specsFileUrl.trim() && !specs) {
      res.status(400).json({ error: "URL de especificaciones inválida" });
      return;
    }
    await prisma.product.create({
      data: {
        category: parsed.data.category,
        name: parsed.data.name,
        slug: parsed.data.slug,
        shortDesc: parsed.data.shortDesc,
        description: parsed.data.description,
        imagesJson: parsed.data.imagesJson,
        specsFileUrl: specs,
        technicalTip: parsed.data.technicalTip?.trim() || null,
        priceCents: parsed.data.priceCents ?? null,
        stock: parsed.data.stock ?? 0,
        loyaltyOnly: parsed.data.loyaltyOnly ?? false,
        published: parsed.data.published ?? true,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.patch("/admin/products/:id", async (req, res, next) => {
  try {
    const parsed = productFormSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const specs = normalizeSpecsUrl(parsed.data.specsFileUrl);
    if (parsed.data.specsFileUrl && parsed.data.specsFileUrl.trim() && !specs) {
      res.status(400).json({ error: "URL de especificaciones inválida" });
      return;
    }
    const previous = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { imagesJson: true, specsFileUrl: true },
    });
    if (!previous) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    await prisma.product.update({
      where: { id: req.params.id },
      data: {
        category: parsed.data.category,
        name: parsed.data.name,
        slug: parsed.data.slug,
        shortDesc: parsed.data.shortDesc,
        description: parsed.data.description,
        imagesJson: parsed.data.imagesJson,
        specsFileUrl: specs,
        technicalTip: parsed.data.technicalTip?.trim() || null,
        priceCents: parsed.data.priceCents ?? null,
        stock: parsed.data.stock ?? 0,
        loyaltyOnly: parsed.data.loyaltyOnly ?? false,
        published: parsed.data.published ?? true,
      },
    });

    await deleteUploadFilesIfUnreferenced(collectUploadPathsFromProduct(previous));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/admin/products/:id", async (req, res, next) => {
  try {
    const row = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { imagesJson: true, specsFileUrl: true },
    });
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const paths = collectUploadPathsFromProduct(row);
    await prisma.product.delete({ where: { id: req.params.id } });
    await deleteUploadFilesIfUnreferenced(paths);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    res.json({ orders });
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.enum(["PENDING", "CONTACTED", "CLOSED", "EXPIRED"]);

router.patch("/admin/orders/:id/status", async (req, res, next) => {
  try {
    const s = statusSchema.safeParse(req.body?.status);
    if (!s.success) {
      res.status(400).json({ error: "Estado inválido" });
      return;
    }
    await prisma.order.update({
      where: { id: req.params.id },
      data: { status: s.data },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        loyaltyExpiresAt: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

const roleSchema = z.enum(["ADMIN", "CUSTOMER"]);

router.patch("/admin/users/:id/role", async (req, res, next) => {
  try {
    const r = roleSchema.safeParse(req.body?.role);
    if (!r.success) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { role: r.data },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/loyalty-codes", async (req, res, next) => {
  try {
    const codes = await prisma.loyaltyCode.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ codes });
  } catch (e) {
    next(e);
  }
});

function generateCode(): string {
  return "MBR-" + randomBytes(4).toString("hex").toUpperCase();
}

const quantityBody = z.object({
  quantity: z.coerce.number().int().min(1).max(50),
});

router.post("/admin/loyalty-codes", async (req, res, next) => {
  try {
    const parsed = quantityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Cantidad inválida" });
      return;
    }
    const count = parsed.data.quantity;
    const expiresAt = new Date(Date.now() + LOYALTY_CODE_VALIDITY_DAYS * 86400000);
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      let code = generateCode();
      while (await prisma.loyaltyCode.findUnique({ where: { code } })) {
        code = generateCode();
      }
      await prisma.loyaltyCode.create({ data: { code, expiresAt } });
      codes.push(code);
    }
    res.json({ ok: true, codes });
  } catch (e) {
    next(e);
  }
});

router.delete("/admin/loyalty-codes/:id", async (req, res, next) => {
  try {
    await prisma.loyaltyCode.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/partners", async (req, res, next) => {
  try {
    const partners = await prisma.partnerCompany.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ partners });
  } catch (e) {
    next(e);
  }
});

router.post("/admin/partners", async (req, res, next) => {
  try {
    const parsed = partnerCompanyFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0];
      res.status(400).json({ error: first ?? "Datos inválidos" });
      return;
    }
    const d = parsed.data;
    await prisma.partnerCompany.create({
      data: {
        name: d.name.trim(),
        slug: d.slug.trim(),
        description: d.description.trim(),
        location: normalizeOptional(d.location),
        contactPhone: normalizeOptional(d.contactPhone),
        websiteUrl: normalizeOptional(d.websiteUrl),
        imageUrl: d.imageUrl.trim() ? d.imageUrl.trim() : null,
        sortOrder: d.sortOrder ?? 0,
        published: d.published ?? true,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.patch("/admin/partners/:id", async (req, res, next) => {
  try {
    const parsed = partnerCompanyFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0];
      res.status(400).json({ error: first ?? "Datos inválidos" });
      return;
    }
    const d = parsed.data;
    const previous = await prisma.partnerCompany.findUnique({
      where: { id: req.params.id },
      select: { imageUrl: true },
    });
    if (!previous) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    await prisma.partnerCompany.update({
      where: { id: req.params.id },
      data: {
        name: d.name.trim(),
        slug: d.slug.trim(),
        description: d.description.trim(),
        location: normalizeOptional(d.location),
        contactPhone: normalizeOptional(d.contactPhone),
        websiteUrl: normalizeOptional(d.websiteUrl),
        imageUrl: d.imageUrl.trim() ? d.imageUrl.trim() : null,
        sortOrder: d.sortOrder ?? 0,
        published: d.published ?? true,
      },
    });

    await deleteUploadFilesIfUnreferenced(collectUploadPathsFromPartner(previous));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/admin/partners/:id", async (req, res, next) => {
  try {
    const row = await prisma.partnerCompany.findUnique({
      where: { id: req.params.id },
      select: { imageUrl: true },
    });
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const paths = collectUploadPathsFromPartner(row);
    await prisma.partnerCompany.delete({ where: { id: req.params.id } });
    await deleteUploadFilesIfUnreferenced(paths);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
