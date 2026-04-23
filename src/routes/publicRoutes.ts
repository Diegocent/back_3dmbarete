import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { registerSchema, contactSchema } from "../lib/validators";
import {
  buildContactEmailHtml,
  contactTypeLabel,
  formatContactEmailBody,
  sendOwnerEmail,
} from "../lib/mail";
import { env } from "../config/env";
import { parseProductImages, sortProductsBySearchRelevance, toProductDTO } from "../lib/productDto";
import { resolveProductImageSrc } from "../lib/productImages";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "El correo ya está registrado" });
      return;
    }

    const submitted = (parsed.data.loyaltyCode ?? "").trim();
    let loyaltyVerifiedAt: Date | null = null;
    let loyaltyExpiresAt: Date | null = null;
    let loyaltyCodeId: string | null = null;

    if (submitted) {
      const code = await prisma.loyaltyCode.findUnique({ where: { code: submitted } });
      if (!code) {
        res.status(400).json({ error: "El código ingresado no existe" });
        return;
      }
      if (!code.isActive) {
        res.status(400).json({ error: "Este código está inactivo" });
        return;
      }
      if (code.expiresAt < new Date()) {
        res.status(400).json({ error: "Este código ha expirado" });
        return;
      }
      loyaltyVerifiedAt = new Date();
      loyaltyCodeId = code.id;
      loyaltyExpiresAt = code.expiresAt;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, env.bcryptSaltRounds);
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        role: "CUSTOMER",
        loyaltyVerifiedAt,
        loyaltyExpiresAt,
        loyaltyCodeId,
      },
    });

    res.json({ ok: true, loyaltyActivated: Boolean(loyaltyExpiresAt) });
  } catch (e) {
    next(e);
  }
});

router.post("/contact", async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Formulario inválido" });
      return;
    }
    if (!env.ownerEmail) {
      res.status(500).json({ error: "OWNER_EMAIL no configurado" });
      return;
    }

    const created = await prisma.contactRequest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        type: parsed.data.type,
        message: parsed.data.message,
      },
      select: { id: true },
    });

    const mailPayload = { ...parsed.data, requestId: created.id };
    await sendOwnerEmail({
      to: env.ownerEmail,
      subject: `Contacto web — ${contactTypeLabel(parsed.data.type)}`,
      text: formatContactEmailBody(mailPayload),
      html: buildContactEmailHtml(mailPayload),
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ results: [] });
      return;
    }

    const rows = await prisma.product.findMany({
      where: { published: true, name: { contains: q } },
      select: { id: true, name: true, slug: true, imagesJson: true },
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    const ql = q.toLowerCase();
    function relevanceScore(name: string, query: string): number {
      if (name === query) return 100;
      const nameWords = name.split(/[\s\-_/+]+/);
      if (nameWords.some((w) => w === query)) return 90;
      if (nameWords[0]?.startsWith(query)) return 75;
      if (nameWords.some((w) => w.startsWith(query))) return 65;
      if (name.includes(query)) return 40;
      return 5;
    }

    const scored = rows.map((r) => ({
      ...r,
      score: relevanceScore(r.name.toLowerCase(), ql),
    }));
    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, 8).map((row) => {
      const thumb = resolveProductImageSrc(parseProductImages(row.imagesJson)[0]);
      return { id: row.id, name: row.name, slug: row.slug, thumb };
    });

    res.json({ results });
  } catch (e) {
    next(e);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const search = String(req.query.search ?? "").trim() || undefined;
    const category = String(req.query.category ?? "").trim() || undefined;
    const loyaltyOnlyRaw = req.query.loyaltyOnly;
    const loyaltyOnly =
      loyaltyOnlyRaw === "true" ? true : loyaltyOnlyRaw === "false" ? false : undefined;

    const rows = await prisma.product.findMany({
      where: {
        published: true,
        ...(loyaltyOnly != null ? { loyaltyOnly } : {}),
        ...(category ? { category } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    let dtos = rows.map(toProductDTO);
    if (search) {
      dtos = sortProductsBySearchRelevance(dtos, search);
    }
    res.json({ products: dtos });
  } catch (e) {
    next(e);
  }
});

router.get("/products/by-slug/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const row = await prisma.product.findFirst({ where: { slug, published: true } });
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json({ product: toProductDTO(row) });
  } catch (e) {
    next(e);
  }
});

router.get("/site-config", async (_req, res, next) => {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    res.json({ heroImageUrl: row?.heroImageUrl ?? null });
  } catch (e) {
    next(e);
  }
});

router.get("/partners", async (req, res, next) => {
  try {
    const rows = await prisma.partnerCompany.findMany({
      where: { published: true, imageUrl: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        location: true,
        contactPhone: true,
        websiteUrl: true,
        imageUrl: true,
      },
    });
    const partners = rows
      .filter((r) => r.imageUrl != null && r.imageUrl.trim() !== "")
      .map((r) => ({ ...r, imageUrl: r.imageUrl! }));
    res.json({ partners });
  } catch (e) {
    next(e);
  }
});

export default router;
