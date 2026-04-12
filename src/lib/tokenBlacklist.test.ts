import { describe, expect, it } from "vitest";
import { invalidarToken, tokenInvalidado } from "./tokenBlacklist";

describe("tokenBlacklist", () => {
  it("marca y detecta tokens invalidados", () => {
    const t = "token-ejemplo-abc";
    expect(tokenInvalidado(t)).toBe(false);
    invalidarToken(t);
    expect(tokenInvalidado(t)).toBe(true);
    expect(tokenInvalidado("  ")).toBe(false);
  });

  it("ignora tokens vacíos al invalidar", () => {
    invalidarToken("");
    invalidarToken("   ");
    expect(tokenInvalidado("")).toBe(false);
  });
});
