/**
 * Archivos bajo `storage/uploads/{products,partners,site}` referenciados en BD vs disco.
 */
import path from "path";
import fs from "fs/promises";
import type { PartnerCompany, Product } from "@prisma/client";
import { prisma } from "./prisma";
import logger from "../config/logger";
import { deleteCloudinaryAssetByPublicId, extractCloudinaryPublicId } from "./cloudinary";

/** Solo rutas públicas que nosotros generamos al subir archivos. */
const UPLOADS_PUBLIC_PATH = /^\/uploads\/(products|partners|site)\/[A-Za-z0-9._-]+$/;

export function extractUploadsPublicPath(ref: string | null | undefined): string | null {
  if (!ref?.trim()) return null;
  const t = ref.trim();
  const withoutQuery = t.split("?")[0] ?? t;
  if (withoutQuery.startsWith("/uploads/")) {
    return UPLOADS_PUBLIC_PATH.test(withoutQuery) ? withoutQuery : null;
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const p = new URL(t).pathname;
      return UPLOADS_PUBLIC_PATH.test(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

function uploadRefFromString(ref: string | null | undefined): string | null {
  const localPath = extractUploadsPublicPath(ref);
  if (localPath) return localPath;
  const cloudinaryPublicId = extractCloudinaryPublicId(ref);
  if (cloudinaryPublicId) return `cloudinary:${cloudinaryPublicId}`;
  return null;
}

export function collectUploadPathsFromProduct(row: Pick<Product, "imagesJson" | "specsFileUrl">): Set<string> {
  const set = new Set<string>();
  const specs = uploadRefFromString(row.specsFileUrl);
  if (specs) set.add(specs);
  try {
    const arr = JSON.parse(row.imagesJson) as unknown;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === "string") {
          const p = uploadRefFromString(item);
          if (p) set.add(p);
        }
      }
    }
  } catch {
    /* ignore invalid JSON */
  }
  return set;
}

export function collectUploadPathsFromSiteSetting(row: { heroImageUrl: string | null }): Set<string> {
  const set = new Set<string>();
  const u = uploadRefFromString(row.heroImageUrl);
  if (u) set.add(u);
  return set;
}

export function collectUploadPathsFromPartner(row: Pick<PartnerCompany, "imageUrl">): Set<string> {
  const set = new Set<string>();
  const p = uploadRefFromString(row.imageUrl);
  if (p) set.add(p);
  return set;
}

function uploadsRootDir(): string {
  return path.join(process.cwd(), "storage", "uploads");
}

/** Ruta absoluta segura bajo `storage/uploads`, o null. */
export function absolutePathForUploadPublicPath(publicPath: string): string | null {
  if (!UPLOADS_PUBLIC_PATH.test(publicPath)) return null;
  const root = path.normalize(uploadsRootDir());
  const rel = publicPath.replace(/^\/uploads\//, "");
  const abs = path.normalize(path.join(root, rel));
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

export async function deleteLocalUploadFiles(publicPaths: Iterable<string>): Promise<number> {
  let n = 0;
  for (const pub of publicPaths) {
    const abs = absolutePathForUploadPublicPath(pub);
    if (!abs) continue;
    try {
      await fs.unlink(abs);
      n++;
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? (e as NodeJS.ErrnoException).code : "";
      if (code !== "ENOENT") {
        logger.warn(`upload-storage: no se pudo borrar ${pub}`, e);
      }
    }
  }
  return n;
}

async function deleteCloudinaryAssets(refs: Iterable<string>): Promise<number> {
  let n = 0;
  for (const ref of refs) {
    if (!ref.startsWith("cloudinary:")) continue;
    const publicId = ref.slice("cloudinary:".length);
    if (!publicId) continue;
    try {
      await deleteCloudinaryAssetByPublicId(publicId);
      n++;
    } catch (e) {
      logger.warn(`upload-storage: no se pudo borrar asset cloudinary ${publicId}`, e);
    }
  }
  return n;
}

/** Todas las rutas `/uploads/...` referenciadas en productos y empresas. */
export async function buildReferencedUploadPathsSet(): Promise<Set<string>> {
  const set = new Set<string>();
  const products = await prisma.product.findMany({
    select: { imagesJson: true, specsFileUrl: true },
  });
  for (const p of products) {
    for (const u of collectUploadPathsFromProduct(p)) set.add(u);
  }
  const partners = await prisma.partnerCompany.findMany({
    select: { imageUrl: true },
  });
  for (const p of partners) {
    for (const u of collectUploadPathsFromPartner(p)) set.add(u);
  }
  const site = await prisma.siteSetting.findUnique({
    where: { id: "default" },
    select: { heroImageUrl: true },
  });
  if (site) {
    for (const u of collectUploadPathsFromSiteSetting(site)) set.add(u);
  }
  return set;
}

/**
 * Borra archivos en disco que no aparecen en ningún registro de la BD.
 * Pensado para cron diario (abandonos de formulario, uploads huérfanos).
 */
export async function cleanupOrphanUploadFiles(): Promise<{ scanned: number; removed: number; errors: string[] }> {
  const referenced = await buildReferencedUploadPathsSet();
  const errors: string[] = [];
  let scanned = 0;
  let removed = 0;

  for (const scope of ["products", "partners", "site"] as const) {
    const dir = path.join(uploadsRootDir(), scope);
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? (e as NodeJS.ErrnoException).code : "";
      if (code === "ENOENT") continue;
      errors.push(`${dir}: ${String(e)}`);
      continue;
    }

    for (const ent of entries) {
      if (!ent.isFile()) continue;
      scanned++;
      const fileName = String(ent.name);
      const pub = `/uploads/${scope}/${fileName}`;
      if (!UPLOADS_PUBLIC_PATH.test(pub)) continue;
      if (referenced.has(pub)) continue;
      const abs = path.join(dir, fileName);
      try {
        await fs.unlink(abs);
        removed++;
        logger.info(`upload-storage: huérfano eliminado ${pub}`);
      } catch (e: unknown) {
        errors.push(`${pub}: ${String(e)}`);
      }
    }
  }

  return { scanned, removed, errors };
}

/** Tras borrar o actualizar BD: elimina archivos cuyas rutas ya no están referenciadas por nadie. */
export async function deleteUploadFilesIfUnreferenced(publicPaths: Iterable<string>): Promise<number> {
  const ref = await buildReferencedUploadPathsSet();
  const toDeleteLocal: string[] = [];
  const toDeleteCloudinary: string[] = [];
  for (const p of publicPaths) {
    if (ref.has(p)) continue;
    if (p.startsWith("cloudinary:")) {
      toDeleteCloudinary.push(p);
    } else {
      toDeleteLocal.push(p);
    }
  }
  const localDeleted = await deleteLocalUploadFiles(toDeleteLocal);
  const cloudinaryDeleted = await deleteCloudinaryAssets(toDeleteCloudinary);
  return localDeleted + cloudinaryDeleted;
}
