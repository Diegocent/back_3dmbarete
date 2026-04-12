import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Carga `back/.env` antes de los tests para que `DATABASE_URL` active la suite de integración con MySQL.
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
