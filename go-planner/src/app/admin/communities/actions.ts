"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { communities } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

export async function createCommunityAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db
    .insert(communities)
    .values({ organizationId: ctx.organizationId, name });
  revalidatePath("/admin/communities");
}
