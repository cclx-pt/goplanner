import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dbSchema from "./schema";
import * as authSchema from "@/core/auth/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não está definido. Copia .env.example para .env.");
}

// Cliente único, reutilizado entre pedidos.
const client = postgres(connectionString);

// Schema completo: domínio (núcleo + módulos) + tabelas de auth.
export const schema = { ...dbSchema, ...authSchema };
export const db = drizzle(client, { schema });
