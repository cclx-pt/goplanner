"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations } from "@/core/db/schema";
import { getPlatformAdmin } from "@/core/platform/access";
import { enableAllModulesForOrg, syncModules } from "@/core/modules/sync";

/** Criar uma organização (tenant). Reservado a admins de plataforma. */
export async function createOrganizationAction(
  formData: FormData,
): Promise<void> {
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const [org] = await db
    .insert(organizations)
    .values({ name })
    .returning({ id: organizations.id });

  // Sincroniza e ativa os módulos na nova org (no-op se não houver módulos).
  await syncModules();
  await enableAllModulesForOrg(org.id);

  revalidatePath("/platform/organizations");
}

/** Renomear uma organização. Reservado a admins de plataforma. */
export async function renameOrganizationAction(
  formData: FormData,
): Promise<void> {
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin) return;

  const orgId = String(formData.get("orgId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name) return;

  await db.update(organizations).set({ name }).where(eq(organizations.id, orgId));
  revalidatePath("/platform/organizations");
  revalidatePath(`/platform/organizations/${orgId}`);
}

/**
 * Eliminar uma organização e TUDO abaixo dela.
 *
 * As FKs do schema não têm ON DELETE CASCADE, por isso o cascade é manual, numa
 * transação e por ordem segura (filhos -> pais). Reservado a admins de
 * plataforma e exige confirmação por nome (anti-acidente).
 */
export async function deleteOrganizationAction(
  formData: FormData,
): Promise<void> {
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin) return;

  const orgId = String(formData.get("orgId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (!orgId) return;

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org) return;

  // Confirmação obrigatória: tem de escrever o nome exato da organização.
  if (confirmName !== org.name) return;

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE organization_id = ${orgId})`,
    );
    await tx.execute(
      sql`DELETE FROM memberships WHERE user_id IN (SELECT id FROM users WHERE organization_id = ${orgId}) OR community_id IN (SELECT id FROM communities WHERE organization_id = ${orgId}) OR role_id IN (SELECT id FROM roles WHERE organization_id = ${orgId})`,
    );
    await tx.execute(
      sql`DELETE FROM organization_modules WHERE organization_id = ${orgId}`,
    );
    await tx.execute(sql`DELETE FROM roles WHERE organization_id = ${orgId}`);
    await tx.execute(
      sql`DELETE FROM communities WHERE organization_id = ${orgId}`,
    );
    await tx.execute(sql`DELETE FROM users WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  });

  revalidatePath("/platform/organizations");
  redirect("/platform/organizations");
}
