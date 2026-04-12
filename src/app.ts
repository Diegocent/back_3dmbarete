import express from "express";
import path from "path";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";

import authRoutes from "./routes/authRoutes";
import publicRoutes from "./routes/publicRoutes";
import checkoutRoutes from "./routes/checkoutRoutes";
import ordersRoutes from "./routes/ordersRoutes";
import healthRoutes from "./routes/healthRoutes";
import adminRoutes from "./routes/adminRoutes";
import uploadRoutes from "./routes/uploadRoutes";

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(process.cwd(), "storage", "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    fallthrough: true,
    maxAge: env.nodeEnv === "production" ? "7d" : 0,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api", publicRoutes);
app.use("/api", checkoutRoutes);
app.use("/api", ordersRoutes);
app.use("/api", healthRoutes);
app.use("/api", adminRoutes);
app.use("/api", uploadRoutes);

app.get("/", (req, res) => {
  res.json({
    nombre: "API 3D Mbarete",
    base: "/api",
    rutas: {
      auth: "POST /api/auth/login, GET /api/auth/session, POST /api/auth/logout",
      publico:
        "POST /api/register, POST /api/contact, GET /api/search, GET /api/products, GET /api/products/by-slug/:slug, GET /api/partners",
      pedidos: "POST /api/checkout, POST /api/orders/expire (header x-cron-secret)",
      salud: "GET /api/health, GET /api/health/database",
      admin: "Bearer ADMIN — /api/admin/* (productos, pedidos, usuarios, códigos, empresas)",
      archivos: "POST /api/panel/upload (ADMIN), GET /uploads/...",
    },
  });
});

app.use(errorHandler);

export default app;
