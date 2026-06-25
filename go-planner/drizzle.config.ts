import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Reúne o schema do núcleo, das tabelas de auth e de cada módulo.
  schema: [
    "./src/core/db/schema.ts",
    "./src/core/auth/schema.ts",
    "./src/modules/**/schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
