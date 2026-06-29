import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import {
  memberships,
  roles,
  modules,
  organizationModules,
  permissions,
  rolePermissions,
} from "@/core/db/schema";
import type { AccessRequest, ResolvedMembership } from "./types";

/**
 * Serviço CENTRAL de resolução de acesso.
 *
 * Esta é a única função que decide quem-pode-o-quê. Nenhum módulo deve
 * reimplementar estas verificações — todos chamam `can()`.
 *
 * Ordem (falha cedo, falha barato):
 *   1. Admin da organização?         -> acesso total (atalho org-wide)
 *   2. Módulo ativo na organização?  -> se não, nega
 *   3. Âmbito coincide?              -> membership cobre a comunidade do pedido?
 *   4. Role concede a permissão?     -> sim concede, não nega
 */
export async function can(req: AccessRequest): Promise<boolean> {
  const userMemberships = await loadMemberships(req.accountId, req.organizationId);

  // 1. Admin da organização (membership org-wide com role.isOrgAdmin).
  const isOrgAdmin = userMemberships.some(
    (m) => m.role.isOrgAdmin && m.communityId === null,
  );
  if (isOrgAdmin) return true;

  // 2. Módulo ativo na organização?
  if (!(await isModuleActive(req.organizationId, req.moduleKey))) {
    return false;
  }

  // 3. Âmbito: memberships cuja comunidade cobre o pedido.
  const inScope = userMemberships.filter(
    (m) => m.communityId === req.communityId,
  );
  if (inScope.length === 0) return false;

  // 4. Algum desses roles concede a permissão?
  for (const m of inScope) {
    const granted = await permissionsForRole(m.role.id);
    if (granted.has(req.permission)) return true;
  }

  return false;
}

/**
 * Carrega as memberships da conta NESTE tenant, com o role embutido.
 *
 * As contas são GLOBAIS (uma conta pode pertencer a vários tenants), por isso o
 * filtro por `organizationId` é OBRIGATÓRIO — nunca avaliar acesso com memberships
 * de outro tenant.
 */
async function loadMemberships(
  accountId: string,
  organizationId: string,
): Promise<ResolvedMembership[]> {
  const rows = await db
    .select({
      communityId: memberships.communityId,
      roleId: roles.id,
      isOrgAdmin: roles.isOrgAdmin,
    })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(memberships.accountId, accountId),
        eq(memberships.organizationId, organizationId),
      ),
    );

  return rows.map((r) => ({
    communityId: r.communityId,
    role: { id: r.roleId, isOrgAdmin: r.isOrgAdmin },
  }));
}

/** Verifica se um módulo está ativo na organização. */
async function isModuleActive(
  organizationId: string,
  moduleKey: string,
): Promise<boolean> {
  const rows = await db
    .select({ active: organizationModules.active })
    .from(organizationModules)
    .innerJoin(modules, eq(organizationModules.moduleId, modules.id))
    .where(
      and(
        eq(organizationModules.organizationId, organizationId),
        eq(modules.key, moduleKey),
      ),
    )
    .limit(1);

  return rows.length > 0 && rows[0].active;
}

/** Conjunto de chaves de permissão concedidas por um role. */
async function permissionsForRole(roleId: string): Promise<Set<string>> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return new Set(rows.map((r) => r.key));
}
