import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signSessionToken } from "../lib/jwt";
import { invalidarToken } from "../lib/tokenBlacklist";
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

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const emailNorm = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
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
      loyaltyExpiresAt: user.loyaltyExpiresAt?.toISOString() ?? null,
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
  res.json({ user: userJson(u) });
});

router.post("/logout", authRequired, (req: AuthRequest, res: Response) => {
  const token = parseBearer(req);
  if (token) invalidarToken(token);
  res.json({ ok: true });
});

export default router;
