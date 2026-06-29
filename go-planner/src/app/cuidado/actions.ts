"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { prayerRequests, careCases } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "cuidado"))) return null;
  return s.ctx;
}

export async function createPrayerAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("cuidado.cuidado.gerir");
  if (!ctx) return;
  const title = String(formData.get("title") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  if (!title) return;
  await db.insert(prayerRequests).values({ organizationId: ctx.organizationId, title, visibility });
  revalidatePath("/cuidado");
}

export async function createCareAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("cuidado.cuidado.gerir");
  if (!ctx) return;
  const note = String(formData.get("note") ?? "").trim();
  const type = String(formData.get("type") ?? "visit");
  if (!note) return;
  await db.insert(careCases).values({ organizationId: ctx.organizationId, type, note });
  revalidatePath("/cuidado");
}
