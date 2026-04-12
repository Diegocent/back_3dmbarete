import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  env: {
    authSecret: "unit-test-jwt-secret-min-32-chars!!",
    sessionExpiresSec: 3600,
  },
}));

import jwt from "jsonwebtoken";
import { signSessionToken, verifySessionToken } from "./jwt";

describe("signSessionToken / verifySessionToken", () => {
  it("firma y verifica el payload de sesión", () => {
    const token = signSessionToken({
      id: "user-1",
      email: "u@example.com",
      name: "Usuario",
      role: "CUSTOMER",
      loyaltyExpiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });
    const p = verifySessionToken(token);
    expect(p.sub).toBe("user-1");
    expect(p.email).toBe("u@example.com");
    expect(p.name).toBe("Usuario");
    expect(p.role).toBe("CUSTOMER");
    expect(p.loyaltyExpiresAt).toBe("2026-12-01T00:00:00.000Z");
  });

  it("lanza si el token es inválido", () => {
    expect(() => verifySessionToken("no-es-jwt")).toThrow(jwt.JsonWebTokenError);
  });
});
