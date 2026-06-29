"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { campuses } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";
export async function createCampusAction(f: FormData): Promise<void> {
  const s = await getAccessState(); if (s.status !== "ok") return;
  if (!(await canHere(s.ctx, "campus.campus.gerir", "campus"))) return;
  const name = String(f.get("name") ?? "").trim(); if (!name) return;
  await db.insert(campuses).values({ organizationId: s.ctx.organizationId, name });
  revalidatePath("/campus");
}
