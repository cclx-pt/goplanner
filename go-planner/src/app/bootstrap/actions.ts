"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import {
  organizations,
  communities,
  people,
  roles,
  memberships,
} from "@/core/db/schema";
import { getAuthSession } from "@/core/auth/session";
import { syncModules, enableAllModulesForOrg } from "@/core/modules/sync";

/**
 * Cria a primeira organização para o utilizador autenticado e torna-o
 * **admin da organização** (membership org-wide com role isOrgAdmin).
 * Também sincroniza os módulos/permissões e ativa-os para a organização.
 */
export async function createOrganizationAction(formData: FormData): Promise<void> {
  const session = await getAuthSession();
  if (!session) redirect("/sign-in");
  const accountId = session.user.id;

  const orgName = String(formData.get("orgName") ?? "").trim();
  const communityName = String(formData.get("communityName") ?? "").trim();
  if (!orgName) throw new Error("O nome da organização é obrigatório.");

  // Idempotência: se a conta já tem QUALQUER membership, segue para o dashboard.
  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(eq(memberships.accountId, accountId))
    .limit(1);
  if (existing) redirect("/dashboard");

  const orgId = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: orgName })
      .returning({ id: organizations.id });

    const [adminRole] = await tx
      .insert(roles)
      .values({
        organizationId: org.id,
        name: "Administrador da organização",
        isOrgAdmin: true,
      })
      .returning({ id: roles.id });

    // Registo de DOMÍNIO (Person) do fundador, dentro do novo tenant.
    const [person] = await tx
      .insert(people)
      .values({
        organizationId: org.id,
        email: session.user.email,
        name: session.user.name ?? null,
      })
      .returning({ id: people.id });

    // Membership: liga a conta GLOBAL a este tenant, com o role de admin e o
    // person recém-criado.
    await tx.insert(memberships).values({
      accountId,
      organizationId: org.id,
      personId: person.id,
      communityId: null,
      roleId: adminRole.id,
    });

    if (communityName) {
      await tx
        .insert(communities)
        .values({ organizationId: org.id, name: communityName });
    }

    return org.id;
  });

  await syncModules();
  await enableAllModulesForOrg(orgId);

  redirect("/dashboard");
}
