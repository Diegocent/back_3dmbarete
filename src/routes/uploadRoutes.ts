import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import multer from "multer";
import { env } from "../config/env";
import { authRequired, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PDF = 15 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function imageExtFromFileName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return ".jpg";
  if (lower.endsWith(".png")) return ".png";
  if (lower.endsWith(".webp")) return ".webp";
  if (lower.endsWith(".gif")) return ".gif";
  return undefined;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF },
});

function publicUploadUrl(localPath: string): string {
  const base = env.publicFilesBaseUrl || `http://localhost:${env.port}`;
  return `${base}${localPath}`;
}

router.post(
  "/panel/upload",
  authRequired,
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      const kind = req.body?.kind;
      const scopeRaw = req.body?.scope;
      const uploadScope = scopeRaw === "partners" ? "partners" : "products";

      if (!file) {
        res.status(400).json({ error: "Falta el archivo" });
        return;
      }
      if (kind !== "image" && kind !== "pdf") {
        res.status(400).json({ error: "Tipo inválido" });
        return;
      }

      const buf = file.buffer;

      if (kind === "image") {
        if (buf.length > MAX_IMAGE) {
          res.status(400).json({ error: "Imagen demasiado grande (máx. 5 MB)" });
          return;
        }
        const ext = IMAGE_EXT[file.mimetype] ?? imageExtFromFileName(file.originalname);
        if (!ext) {
          res.status(400).json({
            error:
              "Solo JPEG, PNG, WebP o GIF (si tu sistema no envía el tipo MIME, usá extensión .jpg / .png / .webp / .gif)",
          });
          return;
        }
        const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
        const dir = path.join(process.cwd(), "storage", "uploads", uploadScope);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, name), buf);
        const localPath = `/uploads/${uploadScope}/${name}`;
        res.json({ url: publicUploadUrl(localPath) });
        return;
      }

      if (buf.length > MAX_PDF) {
        res.status(400).json({ error: "PDF demasiado grande (máx. 15 MB)" });
        return;
      }
      if (file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Solo archivos PDF" });
        return;
      }
      const name = `${Date.now()}-${randomBytes(6).toString("hex")}.pdf`;
      const dir = path.join(process.cwd(), "storage", "uploads", "products");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), buf);
      const localPath = `/uploads/products/${name}`;
      res.json({ url: publicUploadUrl(localPath) });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
