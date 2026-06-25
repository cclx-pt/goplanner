"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import {
  organizations,
  communities,
  users,
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

  const orgName = String(formData.get("orgName") ?? "").trim();
  const communityName = String(formData.get("communityName") ?? "").trim();
  if (!orgName) throw new Error("O nome da organização é obrigatório.");

  // Idempotência: se já está bootstrapped, segue para o dashboard.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authUserId, session.user.id))
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

    const [domainUser] = await tx
      .insert(users)
      .values({
        organizationId: org.id,
        email: session.user.email,
        name: session.user.name ?? null,
        authUserId: session.user.id,
      })
      .returning({ id: users.id });

    await tx.insert(memberships).values({
      userId: domainUser.id,
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
