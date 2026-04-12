import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifySessionToken, type SessionUserPayload } from "../lib/jwt";
import { AppError } from "./errorHandler";
import { tokenInvalidado } from "../lib/tokenBlacklist";

export interface AuthRequest extends Request {
  sessionUser?: SessionUserPayload | null;
}

export function parseBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = parseBearer(req);
    if (!token) {
      next(new AppError("Token no proporcionado (Authorization: Bearer <token>)", 401));
      return;
    }
    if (tokenInvalidado(token)) {
      next(new AppError("Sesión cerrada", 401));
      return;
    }
    req.sessionUser = verifySessionToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("El token expiró", 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Token inválido", 401));
    } else {
      next(error);
    }
  }
}

export function authOptional(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = parseBearer(req);
    if (!token) {
      req.sessionUser = null;
      next();
      return;
    }
    if (tokenInvalidado(token)) {
      req.sessionUser = null;
      next();
      return;
    }
    req.sessionUser = verifySessionToken(token);
    next();
  } catch {
    req.sessionUser = null;
    next();
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.sessionUser?.role !== "ADMIN") {
    next(new AppError("No autorizado", 403));
    return;
  }
  next();
}
