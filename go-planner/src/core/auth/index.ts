import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/core/db";
import { user, session, account, verification } from "./schema";

/**
 * URL base da app, resolvido por ambiente (ver docs/deployment.md):
 * - Produção/QA: BETTER_AUTH_URL fixo (definido no painel da Vercel).
 * - Previews da Vercel: derivado do VERCEL_URL (muda a cada deployment).
 * - Local: cai no default do Better Auth (http://localhost:3000).
 */
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

/**
 * Origens confiáveis para proteção CSRF. Em previews da Vercel o domínio muda a
 * cada deployment, por isso incluímos o VERCEL_URL atual quando existe.
 */
const trustedOrigins = process.env.VERCEL_URL
  ? [`https://${process.env.VERCEL_URL}`]
  : undefined;

/**
 * Better Auth — apenas AUTENTICAÇÃO e identidade (login, sessões).
 *
 * Decisão de arquitetura: a AUTORIZAÇÃO (org → comunidade → role → resolução)
 * vive no NOSSO modelo de domínio e no serviço can(), não no Better Auth. As
 * tabelas de auth estão em ./schema.ts; a ligação ao domínio (conta GLOBAL →
 * tenant) faz-se por `memberships.account_id`.
 */
export const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),
  ...(trustedOrigins ? { trustedOrigins } : {}),
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
