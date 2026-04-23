import { Router } from "express";
import multer from "multer";
import { authRequired, requireAdmin } from "../middlewares/authMiddleware";
import { uploadImageToCloudinary } from "../lib/cloudinary";

const router = Router();

const MAX_IMAGE = 5 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
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
  limits: { fileSize: MAX_IMAGE },
});

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
      const uploadScope =
        scopeRaw === "partners" ? "partners" : scopeRaw === "site" ? "site" : "products";

      if (!file) {
        res.status(400).json({ error: "Falta el archivo" });
        return;
      }
      if (kind !== "image") {
        res.status(400).json({ error: "Tipo inválido (solo imágenes)" });
        return;
      }

      const buf = file.buffer;

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
      const uploaded = await uploadImageToCloudinary({
        scope: uploadScope,
        buffer: buf,
        originalName: file.originalname || `image${ext}`,
      });
      res.json({ url: uploaded.url });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
