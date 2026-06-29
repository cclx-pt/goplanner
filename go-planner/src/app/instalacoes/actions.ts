"use server";
import { revalidatePath } from "next/cache";
import { and, eq, lt, gt } from "drizzle-orm";
import { db } from "@/core/db";
import { rooms, bookings } from "@/core/db/schema";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(p: string) { const s = await getAccessState(); if (s.status !== "ok") return null; if (!(await canHere(s.ctx, p, "instalacoes"))) return null; return s.ctx; }

export async function createRoomAction(f: FormData): Promise<void> {
  const ctx = await ctxFor("instalacoes.sala.gerir"); if (!ctx) return;
  const name = String(f.get("name") ?? "").trim(); if (!name) return;
  await db.insert(rooms).values({ organizationId: ctx.organizationId, name });
  revalidatePath("/instalacoes");
}

export async function createBookingAction(f: FormData): Promise<void> {
  const ctx = await ctxFor("instalacoes.sala.gerir"); if (!ctx) return;
  const roomId = String(f.get("roomId") ?? ""); const title = String(f.get("title") ?? "").trim();
  const startsAt = new Date(String(f.get("startsAt") ?? "")); const endsAt = new Date(String(f.get("endsAt") ?? ""));
  if (!roomId || !title || isNaN(+startsAt) || isNaN(+endsAt) || endsAt <= startsAt) return;
  // Prevenção de dupla marcação: rejeita se houver sobreposição na mesma sala.
  const clash = await db.select({ id: bookings.id }).from(bookings)
    .where(and(eq(bookings.roomId, roomId), lt(bookings.startsAt, endsAt), gt(bookings.endsAt, startsAt))).limit(1);
  if (clash.length) return;
  await db.insert(bookings).values({ organizationId: ctx.organizationId, roomId, title, startsAt, endsAt });
  revalidatePath("/instalacoes");
}
