import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/core/db";
import { user, session, account, verification } from "./schema";

/**
 * Better Auth — apenas AUTENTICAÇÃO e identidade (login, sessões).
 *
 * Decisão de arquitetura: a AUTORIZAÇÃO (org → comunidade → role → resolução)
 * vive no NOSSO modelo de domínio e no serviço can(), não no Better Auth. As
 * tabelas de auth estão em ./schema.ts; a ligação ao domínio faz-se por
 * `users.auth_user_id`.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // socialProviders: { ... }  // adicionar conforme necessário
  plugins: [nextCookies()], // tem de ser o último plugin
});
