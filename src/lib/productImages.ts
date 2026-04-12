const PLACEHOLDER = "/images/placeholder.svg";

export function resolveProductImageSrc(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return PLACEHOLDER;
  return t;
}
