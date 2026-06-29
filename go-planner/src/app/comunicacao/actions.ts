"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { messages, people } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";

/** Compõe uma mensagem para TODAS as pessoas do tenant (segmento simples). */
export async function sendBroadcastAction(formData: FormData): Promise<void> {
  const s = await getAccessState();
  if (s.status !== "ok") return;
  const ctx = s.ctx;
  if (!(await canHere(ctx, "comunicacao.mensagem.enviar", "comunicacao"))) return;

  const channel = String(formData.get("channel") ?? "email");
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const recipients = await db
    .select({ id: people.id })
    .from(people)
    .where(tenantFilter(people, ctx.organizationId));
  if (recipients.length === 0) return;

  await db.insert(messages).values(
    recipients.map((r) => ({
      organizationId: ctx.organizationId,
      personId: r.id,
      channel,
      subject,
      body,
      status: "queued",
    })),
  );
  revalidatePath("/comunicacao");
}
