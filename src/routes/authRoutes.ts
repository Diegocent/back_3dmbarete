import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signSessionToken } from "../lib/jwt";
import { invalidarToken } from "../lib/tokenBlacklist";
import { redeemLoyaltyCodeSchema } from "../lib/validators";
import { authOptional, authRequired, parseBearer, type AuthRequest } from "../middlewares/authMiddleware";

const router = Router();

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function userJson(u: { sub: string; email: string; name: string | null; role: string; loyaltyExpiresAt: string | null }) {
  return {
    id: u.sub,
    email: u.email,
    name: u.name,
    role: u.role,
    loyaltyExpiresAt: u.loyaltyExpiresAt,
  };
}

function effectiveLoyaltyExpiresAt(code: { isActive: boolean; expiresAt: Date } | null | undefined): Date | null {
  if (!code) return null;
  if (!code.isActive) return null;
  if (code.expiresAt <= new Date()) return null;
  return code.expiresAt;
}

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const emailNorm = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
      include: {
        loyaltyCode: { select: { isActive: true, expiresAt: true } },
      },
    });
    if (!user) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }
    const token = signSessionToken(user);
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loyaltyExpiresAt: effectiveLoyaltyExpiresAt(user.loyaltyCode)?.toISOString() ?? null,
    };
    res.json({ ok: true, token, user: userJson(payload) });
  } catch (e) {
    next(e);
  }
});

router.get("/session", authOptional, (req: AuthRequest, res: Response) => {
  const u = req.sessionUser;
  if (!u) {
    res.json({ user: null });
    return;
  }
  void prisma.user
    .findUnique({
      where: { id: u.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        loyaltyCode: { select: { isActive: true, expiresAt: true } },
      },
    })
    .then((dbUser) => {
      if (!dbUser) {
        res.json({ user: null });
        return;
      }
      res.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          loyaltyExpiresAt: effectiveLoyaltyExpiresAt(dbUser.loyaltyCode)?.toISOString() ?? null,
        },
      });
    })
    .catch(() => {
      res.json({ user: null });
    });
});

router.post("/logout", authRequired, (req: AuthRequest, res: Response) => {
  const token = parseBearer(req);
  if (token) invalidarToken(token);
  res.json({ ok: true });
});

router.post("/loyalty/redeem", authRequired, async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = redeemLoyaltyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const submitted = parsed.data.code.trim();
    const sessionSub = req.sessionUser?.sub;
    if (!sessionSub) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionSub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        loyaltyCodeId: true,
      },
    });
    if (!dbUser) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }
    if (dbUser.role === "ADMIN") {
      res.status(403).json({
        error: "Los códigos de fidelidad se activan en cuentas de cliente. La cuenta administradora ya puede comprar en clientes fieles.",
      });
      return;
    }
    const codeRow = await prisma.loyaltyCode.findUnique({ where: { code: submitted } });
    if (!codeRow) {
      res.status(400).json({ error: "El código ingresado no existe" });
      return;
    }
    if (!codeRow.isActive) {
      res.status(400).json({ error: "Este código está inactivo" });
      return;
    }
    if (codeRow.expiresAt < new Date()) {
      res.status(400).json({ error: "Este código ha expirado" });
      return;
    }

    const loyaltyVerifiedAt = new Date();
    const loyaltyExpiresAt = effectiveLoyaltyExpiresAt(codeRow);

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { loyaltyVerifiedAt, loyaltyExpiresAt, loyaltyCodeId: codeRow.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        loyaltyCode: { select: { isActive: true, expiresAt: true } },
      },
    });

    const oldToken = parseBearer(req);
    if (oldToken) invalidarToken(oldToken);

    const token = signSessionToken({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      loyaltyExpiresAt: effectiveLoyaltyExpiresAt(updated.loyaltyCode),
    });
    const payload = {
      sub: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      loyaltyExpiresAt: effectiveLoyaltyExpiresAt(updated.loyaltyCode)?.toISOString() ?? null,
    };
    res.json({ ok: true, token, user: userJson(payload) });
  } catch (e) {
    next(e);
  }
});

export default router;
