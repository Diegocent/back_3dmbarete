import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type SessionUserPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: string;
  loyaltyExpiresAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  loyaltyExpiresAt: Date | null;
};

export function signSessionToken(user: UserRow): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loyaltyExpiresAt: user.loyaltyExpiresAt?.toISOString() ?? null,
    },
    env.authSecret,
    {
      expiresIn: env.sessionExpiresSec,
      algorithm: "HS256",
    },
  );
}

export function verifySessionToken(token: string): SessionUserPayload {
  const decoded = jwt.verify(token, env.authSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload & {
    email?: string;
    name?: string | null;
    role?: string;
    loyaltyExpiresAt?: string | null;
  };
  const id = typeof decoded.sub === "string" ? decoded.sub : null;
  if (!id) throw new jwt.JsonWebTokenError("Token sin subject");
  return {
    sub: id,
    email: typeof decoded.email === "string" ? decoded.email : "",
    name: typeof decoded.name === "string" || decoded.name === null ? decoded.name : null,
    role: typeof decoded.role === "string" ? decoded.role : "CUSTOMER",
    loyaltyExpiresAt:
      typeof decoded.loyaltyExpiresAt === "string" || decoded.loyaltyExpiresAt === null
        ? decoded.loyaltyExpiresAt
        : null,
  };
}
