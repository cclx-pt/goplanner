import { count, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { platformAdmins } from "@/core/db/schema";
import { getAuthSession } from "@/core/auth/session";

/**
 * Camada de PLATAFORMA (torre de controlo).
 *
 * Os platform admins são staff que gere TODOS os tenants. É uma camada separada
 * e acima das organizações — não passa pelo `can()` (que é scoped a org/comunidade).
 * O acesso é provisionado por allowlist de emails (`PLATFORM_ADMIN_EMAILS`): quem
 * está na lista é ativado no primeiro acesso (JIT), de forma idempotente.
 */

export type PlatformRole = "owner" | "admin";

export interface PlatformAdmin {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  role: PlatformRole;
  createdAt: Date;
}

function toPlatformAdmin(row: typeof platformAdmins.$inferSelect): PlatformAdmin {
  return {
    id: row.id,
    authUserId: row.authUserId,
    email: row.email,
    name: row.name,
    role: row.role === "owner" ? "owner" : "admin",
    createdAt: row.createdAt,
  };
}

/** Emails autorizados a aceder à torre de controlo (env, separados por vírgula). */
export function platformAllowlist(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlisted(email: string): boolean {
  return platformAllowlist().includes(email.trim().toLowerCase());
}

async function findByAuthId(authUserId: string): Promise<PlatformAdmin | null> {
  const [row] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.authUserId, authUserId))
    .limit(1);
  return row ? toPlatformAdmin(row) : null;
}

/** Platform admin do utilizador autenticado (ou null). Não provisiona. */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await getAuthSession();
  if (!session) return null;
  return findByAuthId(session.user.id);
}

/** True se o utilizador autenticado já é admin OU está na allowlist (pode entrar). */
export async function isPlatformCandidate(): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  if (await findByAuthId(session.user.id)) return true;
  return isAllowlisted(session.user.email);
}

/**
 * Provisiona (JIT) o utilizador autenticado como platform admin se estiver na
 * allowlist e ainda não existir. Idempotente. O PRIMEIRO admin do sistema fica
 * `owner`. Devolve o admin resolvido ou null (anónimo / fora da allowlist).
 */
export async function ensurePlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await getAuthSession();
  if (!session) return null;

  const existing = await findByAuthId(session.user.id);
  if (existing) return existing;

  if (!isAllowlisted(session.user.email)) return null;

  const [c] = await db.select({ value: count() }).from(platformAdmins);
  const role: PlatformRole = (c?.value ?? 0) === 0 ? "owner" : "admin";

  await db
    .insert(platformAdmins)
    .values({
      authUserId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role,
    })
    .onConflictDoNothing({ target: platformAdmins.authUserId });

  return findByAuthId(session.user.id);
}
