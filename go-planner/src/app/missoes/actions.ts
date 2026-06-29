"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { missionaries } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";
export async function createMissionaryAction(f: FormData): Promise<void> {
  const s = await getAccessState(); if (s.status !== "ok") return;
  if (!(await canHere(s.ctx, "missoes.missao.gerir", "missoes"))) return;
  const name = String(f.get("name") ?? "").trim(); if (!name) return;
  await db.insert(missionaries).values({ organizationId: s.ctx.organizationId, name, field: String(f.get("field") ?? "").trim() || null });
  revalidatePath("/missoes");
}
