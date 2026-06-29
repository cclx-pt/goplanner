import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/core/db";
import { memberships, roles, organizations } from "@/core/db/schema";
import { getAuthSession } from "@/core/auth/session";
import { can } from "./can";

/**
 * Cookie com o TENANT ativo da conta.
 *
 * As contas são globais (podem pertencer a vários tenants), por isso a UI guarda
 * qual a organização ativa. Vive aqui (no core) para ser partilhado pelo contexto
 * e pelas guardas/ações de /admin sem import circular.
 */
export const ACTIVE_ORG_COOKIE = "goplanner.active_org";

/** Contexto de acesso do utilizador autenticado E com organização (bootstrapped). */
export interface AccessContext {
  /** Conta GLOBAL (Better Auth user.id). */
  authUserId: string;
  email: string;
  name: string | null;
  /** Registo de DOMÍNIO (Person) neste tenant. NULL = operador sem registo. */
  personId: string | null;
  /** Tenant EFETIVO (cookie de org ativa, ou o primeiro onde a conta é membro). */
  organizationId: string;
  organizationName: string;
  isOrgAdmin: boolean;
  /** Comunidade "ativa" para scoping da UI (primeira membership de comunidade). */
  activeCommunityId: string | null;
  memberships: { communityId: string | null; isOrgAdmin: boolean }[];
  /** Todos os tenants onde a conta tem membership (para o switcher multi-tenant). */
  organizations: { id: string; name: string }[];
}

/** Estado de acesso, em três casos distintos para a UI rotear corretamente. */
export type AccessState =
  | { status: "anon" }
  | { status: "unbootstrapped"; authUserId: string; email: string; name: string | null }
  | { status: "ok"; ctx: AccessContext };

/**
 * Resolve o estado de acesso a partir da sessão:
 *  - anon            → sem sessão
 *  - unbootstrapped  → autenticado mas sem QUALQUER membership (sem tenant)
 *  - ok              → autenticado e com tenant efetivo (contexto completo)
 *
 * Contas são GLOBAIS: uma conta pode ter memberships em vários tenants. O tenant
 * efetivo vem do cookie de org ativa (se válido), senão o primeiro.
 */
export async function getAccessState(): Promise<AccessState> {
  const session = await getAuthSession();
  if (!session) return { status: "anon" };
  const accountId = session.user.id;

  // Todas as memberships da conta, em TODOS os tenants.
  const rows = await db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      personId: memberships.personId,
      communityId: memberships.communityId,
      isOrgAdmin: roles.isOrgAdmin,
    })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.accountId, accountId));

  if (rows.length === 0) {
    return {
      status: "unbootstrapped",
      authUserId: accountId,
      email: session.user.email,
      name: session.user.name ?? null,
    };
  }

  // Tenants distintos onde a conta é membro.
  const orgMap = new Map<string, string>();
  for (const r of rows) orgMap.set(r.organizationId, r.organizationName);
  const orgs = [...orgMap].map(([id, name]) => ({ id, name }));

  // Tenant efetivo: cookie se for um dos tenants da conta, senão o primeiro.
  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const effective = orgs.find((o) => o.id === wanted) ?? orgs[0];

  // Memberships SÓ do tenant efetivo (nunca misturar tenants).
  const inOrg = rows.filter((r) => r.organizationId === effective.id);
  const isOrgAdmin = inOrg.some((m) => m.isOrgAdmin && m.communityId === null);
  const activeCommunityId =
    inOrg.find((m) => m.communityId !== null)?.communityId ?? null;
  const personId = inOrg.find((m) => m.personId !== null)?.personId ?? null;

  return {
    status: "ok",
    ctx: {
      authUserId: accountId,
      email: session.user.email,
      name: session.user.name ?? null,
      personId,
      organizationId: effective.id,
      organizationName: effective.name,
      isOrgAdmin,
      activeCommunityId,
      memberships: inOrg.map((m) => ({
        communityId: m.communityId,
        isOrgAdmin: m.isOrgAdmin,
      })),
      organizations: orgs,
    },
  };
}

/** Atalho: avalia `can()` com a conta/tenant do contexto atual. */
export function canHere(
  ctx: AccessContext,
  permission: string,
  moduleKey: string,
  communityId: string | null = ctx.activeCommunityId,
): Promise<boolean> {
  return can({
    accountId: ctx.authUserId,
    organizationId: ctx.organizationId,
    permission,
    moduleKey,
    communityId,
  });
}
