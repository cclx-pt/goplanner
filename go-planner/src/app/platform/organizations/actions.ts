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

/** Atualizar a região/localização (locale, moeda, país, fuso) de uma org. */
export async function setOrgRegionAction(formData: FormData): Promise<void> {
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin) return;

  const orgId = String(formData.get("orgId") ?? "");
  const locale = String(formData.get("locale") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!orgId || !locale || !currency || !country || !timezone) return;

  await db
    .update(organizations)
    .set({ locale, currency, country, timezone })
    .where(eq(organizations.id, orgId));
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
    // Consentimentos (FK para people/org) -> apagar antes de people.
    await tx.execute(sql`DELETE FROM consents WHERE organization_id = ${orgId}`);
    await tx.execute(
      sql`DELETE FROM person_tags WHERE person_id IN (SELECT id FROM people WHERE organization_id = ${orgId})`,
    );
    await tx.execute(sql`DELETE FROM milestones WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM workflow_runs WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM tasks WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM workflows WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM donations WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM campaigns WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM objectives WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM funds WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM checkins WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM checkin_events WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM messages WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM message_templates WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM event_registrations WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM events WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM group_members WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM groups WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM prayer_requests WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM care_cases WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM bookings WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM rooms WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM missionaries WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM media_items WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM campuses WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM payment_configs WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM transactions WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM accounts WHERE organization_id = ${orgId}`);
    // Memberships do tenant (FKs para people/communities/roles -> apagar antes).
    // NOTA: as CONTAS (auth.user) são GLOBAIS e NÃO se apagam aqui — podem
    // pertencer a outros tenants. O que se apaga é o vínculo (membership) + o
    // registo de domínio (person) deste tenant.
    await tx.execute(
      sql`DELETE FROM memberships WHERE organization_id = ${orgId}`,
    );
    await tx.execute(
      sql`DELETE FROM organization_modules WHERE organization_id = ${orgId}`,
    );
    await tx.execute(sql`DELETE FROM roles WHERE organization_id = ${orgId}`);
    await tx.execute(
      sql`DELETE FROM communities WHERE organization_id = ${orgId}`,
    );
    await tx.execute(sql`DELETE FROM people WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM households WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM tags WHERE organization_id = ${orgId}`);
    await tx.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  });

  revalidatePath("/platform/organizations");
  redirect("/platform/organizations");
}
