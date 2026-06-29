"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { mediaItems } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";
export async function createMediaAction(f: FormData): Promise<void> {
  const s = await getAccessState(); if (s.status !== "ok") return;
  if (!(await canHere(s.ctx, "media.item.gerir", "media"))) return;
  const title = String(f.get("title") ?? "").trim(); if (!title) return;
  await db.insert(mediaItems).values({ organizationId: s.ctx.organizationId, title, type: String(f.get("type") ?? "sermon"), url: String(f.get("url") ?? "").trim() || null });
  revalidatePath("/media");
}
