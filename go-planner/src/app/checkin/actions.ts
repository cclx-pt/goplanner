"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/core/db";
import { checkinEvents, checkins } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "checkin"))) return null;
  return s.ctx;
}

export async function createEventAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("checkin.checkin.registar");
  if (!ctx) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(checkinEvents).values({ organizationId: ctx.organizationId, name });
  revalidatePath("/checkin");
}

/** Check-in: gera um CÓDIGO de segurança (tag) e regista quem fez o check-in. */
export async function checkInAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("checkin.checkin.registar");
  if (!ctx) return;
  const eventId = String(formData.get("eventId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  if (!eventId || !personId) return;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  await db.insert(checkins).values({
    organizationId: ctx.organizationId,
    eventId,
    personId,
    code,
    checkedInBy: ctx.authUserId,
  });
  revalidatePath("/checkin");
}

/** Check-out: SÓ permitido com o código correspondente (salvaguarda). */
export async function checkOutAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("checkin.checkin.registar");
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!id || !code) return;
  const [row] = await db
    .select({ code: checkins.code })
    .from(checkins)
    .where(and(eq(checkins.id, id), eq(checkins.organizationId, ctx.organizationId), isNull(checkins.checkedOutAt)))
    .limit(1);
  if (!row || row.code !== code) return; // tag não corresponde -> recolha negada
  await db
    .update(checkins)
    .set({ checkedOutAt: new Date(), checkedOutBy: ctx.authUserId })
    .where(eq(checkins.id, id));
  revalidatePath("/checkin");
}
