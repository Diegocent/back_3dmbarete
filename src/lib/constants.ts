export const PRODUCT_CATEGORIES = ["MAQUINA", "MATERIAL", "REPUESTO"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const LOYALTY_CODE_VALIDITY_DAYS = 30;
export const LOYALTY_ACCESS_DAYS = 90;
