import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { users, memberships, roles } from "@/core/db/schema";
import { getAuthSession } from "@/core/auth/session";
import { can } from "./can";

/** Contexto de acesso do utilizador autenticado E com organização (bootstrapped). */
export interface AccessContext {
  authUserId: string;
  email: string;
  name: string | null;
  /** Id do utilizador de DOMÍNIO (memberships.userId), não o do Better Auth. */
  domainUserId: string;
  organizationId: string;
  isOrgAdmin: boolean;
  /** Comunidade "ativa" para scoping da UI (primeira membership de comunidade). */
  activeCommunityId: string | null;
  memberships: { communityId: string | null; isOrgAdmin: boolean }[];
}

/** Estado de acesso, em três casos distintos para a UI rotear corretamente. */
export type AccessState =
  | { status: "anon" }
  | { status: "unbootstrapped"; authUserId: string; email: string; name: string | null }
  | { status: "ok"; ctx: AccessContext };

/**
 * Resolve o estado de acesso a partir da sessão:
 *  - anon            → sem sessão
 *  - unbootstrapped  → autenticado mas ainda sem utilizador de domínio/organização
 *  - ok              → autenticado e com organização (contexto completo)
 */
export async function getAccessState(): Promise<AccessState> {
  const session = await getAuthSession();
  if (!session) return { status: "anon" };

  const [u] = await db
    .select({ id: users.id, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.authUserId, session.user.id))
    .limit(1);

  if (!u) {
    return {
      status: "unbootstrapped",
      authUserId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    };
  }

  const mems = await db
    .select({ communityId: memberships.communityId, isOrgAdmin: roles.isOrgAdmin })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(eq(memberships.userId, u.id));

  const isOrgAdmin = mems.some((m) => m.isOrgAdmin && m.communityId === null);
  const activeCommunityId = mems.find((m) => m.communityId !== null)?.communityId ?? null;

  return {
    status: "ok",
    ctx: {
      authUserId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      domainUserId: u.id,
      organizationId: u.organizationId,
      isOrgAdmin,
      activeCommunityId,
      memberships: mems,
    },
  };
}

/** Atalho: avalia `can()` com o utilizador/organização do contexto atual. */
export function canHere(
  ctx: AccessContext,
  permission: string,
  moduleKey: string,
  communityId: string | null = ctx.activeCommunityId,
): Promise<boolean> {
  return can({
    userId: ctx.domainUserId,
    organizationId: ctx.organizationId,
    permission,
    moduleKey,
    communityId,
  });
}
