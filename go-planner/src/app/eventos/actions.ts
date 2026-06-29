"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { events, eventRegistrations } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "eventos"))) return null;
  return s.ctx;
}

export async function createEventAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("eventos.evento.gerir");
  if (!ctx) return;
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const capacity = parseInt(String(formData.get("capacity") ?? ""), 10);
  if (!name) return;
  await db.insert(events).values({
    organizationId: ctx.organizationId,
    name,
    location,
    capacity: Number.isFinite(capacity) ? capacity : null,
  });
  revalidatePath("/eventos");
}

export async function registerAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("eventos.evento.gerir");
  if (!ctx) return;
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) return;
  const [ev] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, ctx.organizationId)))
    .limit(1);
  if (!ev) return;
  await db.insert(eventRegistrations).values({
    organizationId: ctx.organizationId,
    eventId,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
  });
  revalidatePath("/eventos");
}
