/**
 * Variables de entorno (API 3D Mbarete + MySQL).
 */
import dotenv from "dotenv";

dotenv.config();

const DEV_AUTH_FALLBACK = "dev-only-define-AUTH_SECRET-in-dotenv-32chars-min!!";

function authSecret(): string {
  const raw = process.env.AUTH_SECRET ?? process.env.JWT_SECRET;
  if (raw?.trim()) return raw.trim();
  /** Solo en `production` real exigimos secreto (evita crash si el SO tiene NODE_ENV=production al hacer `npm run dev`). */
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (o JWT_SECRET) es obligatorio en producción");
  }
  return DEV_AUTH_FALLBACK;
}

/** Orígenes típicos de Vite (puertos variables) para no bloquear el front en local. */
function viteLocalDevOrigins(): string[] {
  const out: string[] = [];
  for (let p = 5173; p <= 5190; p++) {
    out.push(`http://localhost:${p}`, `http://127.0.0.1:${p}`);
  }
  return out;
}

function corsOrigin(): boolean | string[] {
  if (process.env.CORS_ORIGIN === "*") return true;
  const raw = process.env.CORS_ORIGIN?.trim();
  const isProd = process.env.NODE_ENV === "production";
  if (!raw) return true;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProd) return list;
  return [...new Set([...list, ...viteLocalDevOrigins()])];
}

export const env = {
  port: parseInt(process.env.PORT || "3056", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  authSecret: authSecret(),
  /** Segundos de vida del JWT (30 días, alineado con `web` SESSION_MAX_AGE_SEC) */
  sessionExpiresSec: parseInt(process.env.JWT_EXPIRES_SEC || String(30 * 24 * 60 * 60), 10),
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
  ownerEmail: process.env.OWNER_EMAIL || "",
  cronSecret: process.env.CRON_SECRET || "",
  corsOrigin: corsOrigin(),
  /** URL base para archivos subidos (ej. https://api.tudominio.com) */
  publicFilesBaseUrl: (process.env.PUBLIC_FILES_BASE_URL || "").replace(/\/$/, ""),
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM ?? "3D Mbarete <onboarding@resend.dev>",
};
