import { describe, expect, it } from "vitest";
import { contactSchema, isValidProductImageEntry, redeemLoyaltyCodeSchema, registerSchema } from "./validators";

describe("isValidProductImageEntry", () => {
  it("rechaza data URL (solo rutas o URLs)", () => {
    expect(
      isValidProductImageEntry(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ),
    ).toBe(false);
  });

  it("acepta ruta /uploads/products/", () => {
    expect(isValidProductImageEntry("/uploads/products/z-1.jpg")).toBe(true);
  });
});

describe("registerSchema", () => {
  it("acepta datos válidos", () => {
    const r = registerSchema.safeParse({
      name: "María López",
      email: "maria@example.com",
      password: "password123",
      loyaltyCode: "",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const r = registerSchema.safeParse({
      name: "María López",
      email: "no-email",
      password: "password123",
    });
    expect(r.success).toBe(false);
  });
});

describe("redeemLoyaltyCodeSchema", () => {
  it("acepta código recortado", () => {
    const r = redeemLoyaltyCodeSchema.safeParse({ code: "  MBR-ABCD1234  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.code).toBe("MBR-ABCD1234");
  });

  it("rechaza código corto", () => {
    const r = redeemLoyaltyCodeSchema.safeParse({ code: "abc" });
    expect(r.success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("acepta mensaje de contacto válido", () => {
    const r = contactSchema.safeParse({
      name: "Cliente",
      email: "c@example.com",
      phone: "",
      type: "presupuesto",
      message: "Necesito un presupuesto para piezas.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza mensaje demasiado corto", () => {
    const r = contactSchema.safeParse({
      name: "Cliente",
      email: "c@example.com",
      type: "otro",
      message: "corto",
    });
    expect(r.success).toBe(false);
  });
});
