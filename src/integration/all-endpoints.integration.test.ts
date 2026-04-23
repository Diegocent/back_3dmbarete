/**
 * Recorre los endpoints de la API con Supertest (app in-process = mismo stack que `npm run dev`).
 * Requiere `DATABASE_URL` y credenciales de admin en `.env` (Vitest carga `back/.env`).
 */
import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@3dmbarete.local";
const adminPass = process.env.ADMIN_SEED_PASSWORD ?? "admin1234";

describe.skipIf(!hasDb)("Endpoints API (lectura + auth + validaciones)", () => {
  let adminToken = "";
  let productSlug = "";
  let productId = "";
  let orderId = "";

  beforeAll(async () => {
    const p = await prisma.product.findFirst({
      where: { published: true, stock: { gt: 0 } },
      select: { id: true, slug: true },
    });
    productId = p?.id ?? "";
    productSlug = p?.slug ?? "";
    const o = await prisma.order.findFirst({ select: { id: true } });
    orderId = o?.id ?? "";
  });

  it("GET /", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.body.base).toBe("/api");
  });

  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ ok: true, service: "3d-mbarete-api" });
  });

  it("GET /api/health/database", async () => {
    const res = await request(app).get("/api/health/database").expect(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.adminUsers).toBe("number");
  });

  it("GET /api/products", async () => {
    const res = await request(app).get("/api/products").expect(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it("GET /api/products con query", async () => {
    const res = await request(app).get("/api/products").query({ search: "a", category: "MATERIAL" }).expect(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it("GET /api/products/by-slug/:slug", async () => {
    if (!productSlug) {
      expect(productId).toBe("");
      return;
    }
    const res = await request(app).get(`/api/products/by-slug/${encodeURIComponent(productSlug)}`).expect(200);
    expect(res.body.product?.slug).toBe(productSlug);
  });

  it("GET /api/products/by-slug inexistente -> 404", async () => {
    await request(app).get("/api/products/by-slug/__slug_que_no_existe_12345__").expect(404);
  });

  it("GET /api/partners", async () => {
    const res = await request(app).get("/api/partners").expect(200);
    expect(Array.isArray(res.body.partners)).toBe(true);
  });

  it("GET /api/search corto -> results vacío", async () => {
    const res = await request(app).get("/api/search").query({ q: "a" }).expect(200);
    expect(res.body.results).toEqual([]);
  });

  it("GET /api/search", async () => {
    const res = await request(app).get("/api/search").query({ q: "ab" }).expect(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it("POST /api/register inválido -> 400", async () => {
    const res = await request(app).post("/api/register").send({ email: "x" }).expect(400);
    expect(res.body.error).toBe("Datos inválidos");
  });

  it("POST /api/contact inválido -> 400", async () => {
    await request(app).post("/api/contact").send({ name: "a" }).expect(400);
  });

  it("POST /api/contact válido (si OWNER_EMAIL)", async () => {
    const body = {
      name: "Prueba integración",
      email: "integracion-api@test.local",
      phone: "",
      type: "otro" as const,
      message: "Mensaje generado por suite de integración del backend.",
    };
    const res = await request(app).post("/api/contact").send(body);
    if (!process.env.OWNER_EMAIL?.trim()) {
      expect(res.status).toBe(503);
      return;
    }
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("POST /api/auth/login credenciales malas -> 401", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password: "___incorrecta___" })
      .expect(401);
  });

  it("POST /api/auth/login admin -> token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: adminEmail, password: adminPass }).expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.role).toBe("ADMIN");
    adminToken = res.body.token as string;
  });

  it("GET /api/auth/session sin token -> user null", async () => {
    const res = await request(app).get("/api/auth/session").expect(200);
    expect(res.body.user).toBeNull();
  });

  it("GET /api/auth/session con Bearer admin", async () => {
    const res = await request(app).get("/api/auth/session").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.user?.email).toBe(adminEmail.toLowerCase());
  });

  it("GET /api/admin/* sin token -> 401", async () => {
    await request(app).get("/api/admin/products").expect(401);
  });

  it("GET /api/admin/products", async () => {
    const res = await request(app).get("/api/admin/products").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it("GET /api/admin/orders", async () => {
    const res = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it("GET /api/admin/users", async () => {
    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("GET /api/admin/loyalty-codes", async () => {
    const res = await request(app).get("/api/admin/loyalty-codes").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.codes)).toBe(true);
  });

  it("GET /api/admin/partners", async () => {
    const res = await request(app).get("/api/admin/partners").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.partners)).toBe(true);
  });

  it("POST /api/admin/products cuerpo inválido -> 400", async () => {
    await request(app).post("/api/admin/products").set("Authorization", `Bearer ${adminToken}`).send({}).expect(400);
  });

  it("POST /api/admin/loyalty-codes cantidad inválida -> 400", async () => {
    await request(app).post("/api/admin/loyalty-codes").set("Authorization", `Bearer ${adminToken}`).send({}).expect(400);
  });

  it("PATCH /api/admin/orders/:id/status estado inválido -> 400", async () => {
    if (!orderId) return;
    await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "INVALIDO" })
      .expect(400);
  });

  it("PATCH /api/admin/users/:id/rol inválido -> 400", async () => {
    const u = await prisma.user.findFirst({ where: { email: adminEmail }, select: { id: true } });
    if (!u) return;
    await request(app)
      .patch(`/api/admin/users/${u.id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "NO_ROLE" })
      .expect(400);
  });

  it("POST /api/panel/upload sin archivo -> 400", async () => {
    await request(app).post("/api/panel/upload").set("Authorization", `Bearer ${adminToken}`).expect(400);
  });

  it("POST /api/checkout items vacíos -> 400", async () => {
    await request(app).post("/api/checkout").send({ items: [] }).expect(400);
  });

  it("POST /api/orders/expire", async () => {
    const res = await request(app).post("/api/orders/expire").expect(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.expiredOrders).toBe("number");
  });

  it("POST /api/auth/loyalty/redeem sin token -> 401", async () => {
    await request(app).post("/api/auth/loyalty/redeem").send({ code: "MBR-00000000" }).expect(401);
  });

  it("POST /api/auth/loyalty/redeem con admin -> 403", async () => {
    await request(app)
      .post("/api/auth/loyalty/redeem")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "MBR-00000000" })
      .expect(403);
  });

  it("POST /api/auth/loyalty/redeem cliente con código válido", async () => {
    const stamp = Date.now();
    const email = `loy-redeem-${stamp}@test.local`;
    await request(app)
      .post("/api/register")
      .send({ name: "Redeem Test", email, password: "password123", loyaltyCode: "" })
      .expect(200);
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" }).expect(200);
    const customerToken = loginRes.body.token as string;
    const codeRes = await request(app)
      .post("/api/admin/loyalty-codes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: 1 })
      .expect(200);
    const code = (codeRes.body.codes as string[])[0];
    const redeemRes = await request(app)
      .post("/api/auth/loyalty/redeem")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ code })
      .expect(200);
    expect(redeemRes.body.ok).toBe(true);
    expect(redeemRes.body.token).toBeTruthy();
    expect(redeemRes.body.user?.loyaltyExpiresAt).toBeTruthy();
    const newTok = redeemRes.body.token as string;
    const sess = await request(app).get("/api/auth/session").set("Authorization", `Bearer ${newTok}`).expect(200);
    expect(sess.body.user?.loyaltyExpiresAt).toBeTruthy();
  });

  it("POST /api/auth/logout", async () => {
    await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${adminToken}`).expect(200);
  });
});
