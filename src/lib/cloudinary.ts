import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  if (!env.cloudinaryUrl) {
    throw new Error("Falta CLOUDINARY_URL en el entorno del backend.");
  }
  cloudinary.config({ cloudinary_url: env.cloudinaryUrl });
  configured = true;
}

function sanitizeBaseName(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "asset";
}

export function cloudinaryFolderForScope(scope: "products" | "partners" | "site"): string {
  return `3d-mbarete/${scope}`;
}

export async function uploadImageToCloudinary(params: {
  scope: "products" | "partners" | "site";
  buffer: Buffer;
  originalName: string;
}): Promise<{ url: string; publicId: string }> {
  ensureConfigured();
  const baseName = sanitizeBaseName(params.originalName.split(".")[0] ?? "asset");
  const folder = cloudinaryFolderForScope(params.scope);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: baseName,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }
        if (!uploadResult) {
          reject(new Error("Cloudinary no devolvió resultado de subida."));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(params.buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteCloudinaryAssetByPublicId(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export function extractCloudinaryPublicId(ref: string | null | undefined): string | null {
  if (!ref?.trim()) return null;
  const t = ref.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return null;
  }

  if (!/(\.|^)cloudinary\.com$/i.test(url.hostname)) return null;
  const marker = "/upload/";
  const idx = url.pathname.indexOf(marker);
  if (idx < 0) return null;
  let rest = url.pathname.slice(idx + marker.length);
  if (!rest) return null;

  rest = rest.replace(/^v\d+\//, "");
  const withoutExt = rest.replace(/\.[a-zA-Z0-9]+$/, "");
  return withoutExt || null;
}
