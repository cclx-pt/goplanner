"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { roles } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

export async function createRoleAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(roles).values({
    organizationId: ctx.organizationId,
    name,
    isOrgAdmin: false,
  });
  revalidatePath("/admin/roles");
}
