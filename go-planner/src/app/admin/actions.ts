"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, memberships } from "@/core/db/schema";
import { getAuthSession } from "@/core/auth/session";
import { getPlatformAdmin } from "@/core/platform/access";
import { ACTIVE_ORG_COOKIE } from "@/core/access/context";

/**
 * Define o TENANT ativo (cookie). Um admin de plataforma (master) pode escolher
 * QUALQUER organização; uma conta normal só os tenants onde tem membership.
 * Devolve true se aplicada.
 */
async function setActiveOrg(orgId: string): Promise<boolean> {
  if (!orgId) return false;

  const platformAdmin = await getPlatformAdmin();
  if (platformAdmin) {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!org) return false;
  } else {
    // Conta normal: só pode ativar tenants onde é membro.
    const session = await getAuthSession();
    if (!session) return false;
    const [mem] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.accountId, session.user.id),
          eq(memberships.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!mem) return false;
  }

  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return true;
}

/** Trocar a organização ativa, ficando no /admin. */
export async function setActiveOrgAction(formData: FormData): Promise<void> {
  await setActiveOrg(String(formData.get("orgId") ?? ""));
  revalidatePath("/admin");
}

/** Escolher uma organização para gerir e ir para o /admin. */
export async function manageOrgAction(formData: FormData): Promise<void> {
  if (await setActiveOrg(String(formData.get("orgId") ?? ""))) {
    redirect("/admin");
  }
}
