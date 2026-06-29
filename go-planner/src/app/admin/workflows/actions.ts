"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { workflows } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

/** Ativar/desativar um workflow do tenant efetivo. */
export async function toggleWorkflowAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const [wf] = await db
    .select({ active: workflows.active })
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.organizationId, ctx.organizationId)))
    .limit(1);
  if (!wf) return;
  await db.update(workflows).set({ active: !wf.active }).where(eq(workflows.id, id));
  revalidatePath("/admin/workflows");
}
