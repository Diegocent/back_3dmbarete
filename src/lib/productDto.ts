import { PRODUCT_CATEGORIES, type ProductCategory } from "./constants";

export type ProductDTO = {
  id: string;
  category: ProductCategory;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  images: string[];
  specsFileUrl: string | null;
  technicalTip: string | null;
  priceCents: number | null;
  stock: number;
  loyaltyOnly: boolean;
  requestQuoteOnly: boolean;
};

export function parseProductImages(imagesJson: string): string[] {
  try {
    const v = JSON.parse(imagesJson) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  } catch {
    return [];
  }
}

function normalizeCategory(raw: string): ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(raw) ? (raw as ProductCategory) : "REPUESTO";
}

export function toProductDTO(row: {
  id: string;
  category: string;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  imagesJson: string;
  specsFileUrl: string | null;
  technicalTip: string | null;
  priceCents: number | null;
  stock: number;
  loyaltyOnly: boolean;
  requestQuoteOnly?: boolean;
}): ProductDTO {
  return {
    id: row.id,
    category: normalizeCategory(row.category),
    name: row.name,
    slug: row.slug,
    shortDesc: row.shortDesc,
    description: row.description,
    images: parseProductImages(row.imagesJson),
    specsFileUrl: row.specsFileUrl,
    technicalTip: row.technicalTip,
    priceCents: row.priceCents,
    stock: row.stock,
    loyaltyOnly: row.loyaltyOnly,
    requestQuoteOnly: Boolean(row.requestQuoteOnly),
  };
}

function relevanceScore(name: string, query: string): number {
  const nl = name.toLowerCase();
  const ql = query.toLowerCase();
  if (nl === ql) return 100;
  const words = nl.split(/[\s\-_/+]+/);
  if (words.some((w) => w === ql)) return 90;
  if (words[0]?.startsWith(ql)) return 75;
  if (words.some((w) => w.startsWith(ql))) return 65;
  if (nl.includes(ql)) return 40;
  return 0;
}

export function sortProductsBySearchRelevance<T extends { name: string }>(products: T[], search: string): T[] {
  const ql = search.toLowerCase();
  return [...products].sort((a, b) => relevanceScore(b.name, ql) - relevanceScore(a.name, ql));
}
