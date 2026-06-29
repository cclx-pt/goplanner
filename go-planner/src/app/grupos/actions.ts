"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { groups, groupMembers } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "grupos"))) return null;
  return s.ctx;
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("grupos.grupo.gerir");
  if (!ctx) return;
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "cell");
  if (!name) return;
  await db.insert(groups).values({ organizationId: ctx.organizationId, name, type });
  revalidatePath("/grupos");
}

export async function addGroupMemberAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("grupos.grupo.gerir");
  if (!ctx) return;
  const groupId = String(formData.get("groupId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  if (!groupId || !personId) return;
  const [g] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.organizationId, ctx.organizationId)))
    .limit(1);
  if (!g) return;
  await db
    .insert(groupMembers)
    .values({ organizationId: ctx.organizationId, groupId, personId })
    .onConflictDoNothing();
  revalidatePath("/grupos");
}
