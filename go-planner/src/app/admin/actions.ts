"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations } from "@/core/db/schema";
import { getPlatformAdmin } from "@/core/platform/access";
import { ACTIVE_ORG_COOKIE } from "./guard";

/**
 * Define a organização ATIVA. Reservado a admins de plataforma (master) — um
 * admin de organização normal nunca troca de org. Devolve true se aplicada.
 */
async function setActiveOrg(orgId: string): Promise<boolean> {
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin || !orgId) return false;

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org) return false;

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
