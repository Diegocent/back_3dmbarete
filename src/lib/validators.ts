import { z } from "zod";
import { PRODUCT_CATEGORIES } from "./constants";

export const productCategorySchema = z.enum(PRODUCT_CATEGORIES);

const uploadSpecsPathRegex = /^\/uploads\/products\/[A-Za-z0-9._-]+$/;
const uploadProductImagePathRegex = /^\/uploads\/products\/[A-Za-z0-9._-]+$/;
const demoImagePathRegex = /^\/images\/[A-Za-z0-9._-]+$/;

/** Referencia de imagen: archivo en `/uploads/products/…`, demo `/images/…` o URL http(s). No data URLs. */
export function isValidProductImageEntry(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("data:")) return false;
  if (uploadProductImagePathRegex.test(t)) return true;
  if (demoImagePathRegex.test(t)) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSpecsRef(s: string): boolean {
  if (uploadSpecsPathRegex.test(s)) return true;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export const productFormSchema = z.object({
  category: productCategorySchema,
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  shortDesc: z.string().min(5).max(200),
  description: z.string().min(10).max(8000),
  imagesJson: z.string().superRefine((s, ctx) => {
    const MAX_JSON = 256 * 1024;
    const MAX_PER = 2048;
    const MAX_ITEMS = 24;
    if (s.length > MAX_JSON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lista de imágenes demasiado grande" });
      return;
    }
    let arr: unknown;
    try {
      arr = JSON.parse(s);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "JSON de imágenes inválido" });
      return;
    }
    if (!Array.isArray(arr)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "imagesJson debe ser un array" });
      return;
    }
    if (arr.length > MAX_ITEMS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Demasiadas imágenes (máx. 24)" });
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      const x = arr[i];
      if (typeof x !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Imagen ${i + 1}: debe ser texto` });
        return;
      }
      if (x.length > MAX_PER) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Imagen ${i + 1}: demasiado grande` });
        return;
      }
      if (!isValidProductImageEntry(x)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Imagen ${i + 1}: ruta /uploads, /images o URL http(s) inválida` });
        return;
      }
    }
  }),
  specsFileUrl: z.preprocess(
    (v) => (v === undefined || v === null ? "" : String(v)),
    z.string().max(2048).superRefine((val, ctx) => {
      if (val === "") return;
      if (!isValidSpecsRef(val)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL o PDF subido inválido" });
      }
    }),
  ),
  technicalTip: z.string().max(4000).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).optional().default(0),
  loyaltyOnly: z.boolean().optional(),
  published: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  loyaltyCode: z.string().min(4).max(64).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  type: z.enum(["presupuesto", "soporte", "otro"]),
  message: z.string().min(10).max(4000),
});

const partnerUploadPathRegex = /^\/uploads\/partners\/[A-Za-z0-9._-]+$/;

function isValidPartnerImageRef(s: string): boolean {
  const t = s.trim();
  if (partnerUploadPathRegex.test(t)) return true;
  if (t.startsWith("/images/")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const partnerCompanyFormSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z
      .string()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(10).max(4000),
    location: z.preprocess((v) => (v === undefined || v === null ? "" : String(v)), z.string().max(200)),
    contactPhone: z.preprocess((v) => (v === undefined || v === null ? "" : String(v)), z.string().max(60)),
    websiteUrl: z.preprocess((v) => (v === undefined || v === null ? "" : String(v)), z.string().max(500)),
    imageUrl: z.preprocess((v) => (v === undefined || v === null ? "" : String(v)), z.string().max(500)),
    sortOrder: z.coerce.number().int().min(0).max(99999).optional().default(0),
    published: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const web = data.websiteUrl.trim();
    if (web !== "" && !URL.canParse(web)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sitio web inválido", path: ["websiteUrl"] });
    }
    if (data.published) {
      const img = data.imageUrl.trim();
      if (!img) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Para publicar necesitás subir una imagen (logo o foto de la empresa).",
          path: ["imageUrl"],
        });
        return;
      }
      if (!isValidPartnerImageRef(img)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ruta o URL de imagen no permitida", path: ["imageUrl"] });
      }
    }
  });

export const cartCheckoutSchema = z.object({
  guestName: z.string().max(120).optional().or(z.literal("")),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().max(40).optional().or(z.literal("")),
  guestAddress: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});
