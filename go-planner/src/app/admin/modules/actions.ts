"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizationModules } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

export async function setModuleActiveAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const orgModuleId = String(formData.get("orgModuleId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!orgModuleId) return;

  await db
    .update(organizationModules)
    .set({ active })
    .where(
      and(
        eq(organizationModules.id, orgModuleId),
        eq(organizationModules.organizationId, ctx.organizationId),
      ),
    );
  revalidatePath("/admin/modules");
}
