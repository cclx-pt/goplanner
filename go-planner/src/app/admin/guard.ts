import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/core/db";
import { organizations } from "@/core/db/schema";
import { getAccessState, ACTIVE_ORG_COOKIE } from "@/core/access/context";
import { getPlatformAdmin } from "@/core/platform/access";

export { ACTIVE_ORG_COOKIE };

/**
 * Contexto da área de administração.
 *
 * `organizationId`/`organizationName` são a organização EFETIVA a gerir:
 *  - Admin de organização normal -> a sua própria organização (ou, se a conta
 *    for membro de vários tenants, a ativa escolhida no dropdown).
 *  - Admin de PLATAFORMA (master) -> a organização ATIVA escolhida no dropdown
 *    (cookie), podendo trocar entre TODAS (`switchableOrgs`).
 */
export interface AdminContext {
  organizationId: string;
  organizationName: string;
  actingAsPlatform: boolean;
  switchableOrgs: { id: string; name: string }[];
}

/**
 * Guarda das páginas/ações de administração. Defesa em profundidade: cada
 * server action volta a chamar isto — nunca confiar só no layout.
 *
 * Resolve a organização efetiva: o admin de plataforma é master sobre TODAS as
 * organizações e escolhe a ativa; o admin de organização gere os tenants onde é
 * membro (normalmente um só).
 */
export async function requireOrgAdmin(): Promise<AdminContext> {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");

  // Admin de PLATAFORMA: master de todas as orgs (escolhe a ativa).
  const platformAdmin = await getPlatformAdmin();
  if (platformAdmin) {
    const orgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .orderBy(organizations.name);

    if (orgs.length === 0) redirect("/platform/organizations");

    const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
    const active = orgs.find((o) => o.id === wanted) ?? orgs[0];

    return {
      organizationId: active.id,
      organizationName: active.name,
      actingAsPlatform: true,
      switchableOrgs: orgs,
    };
  }

  // Admin de ORGANIZAÇÃO: o tenant efetivo vem do contexto (cookie de org ativa
  // entre os tenants da conta). Tem de ser admin NESSE tenant.
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  if (!state.ctx.isOrgAdmin) redirect("/dashboard");

  return {
    organizationId: state.ctx.organizationId,
    organizationName: state.ctx.organizationName,
    actingAsPlatform: false,
    // Contas globais podem ser membros de vários tenants -> switcher.
    switchableOrgs: state.ctx.organizations,
  };
}
