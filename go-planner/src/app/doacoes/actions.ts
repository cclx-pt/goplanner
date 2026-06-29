"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { funds, donations } from "@/core/db/schema";
import { fromMajor } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "doacoes"))) return null;
  return s.ctx;
}

/** Criar um fundo (moeda da org por defeito). */
export async function createFundAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("doacoes.doacao.registar");
  if (!ctx) return;
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  if (!name) return;
  await db.insert(funds).values({ organizationId: ctx.organizationId, name, currency });
  revalidatePath("/doacoes");
}

/** Registar uma doação (valor maior -> unidades menores via core de dinheiro). */
export async function recordDonationAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("doacoes.doacao.registar");
  if (!ctx) return;
  const fundId = String(formData.get("fundId") ?? "");
  const amount = parseFloat(String(formData.get("amount") ?? "").replace(",", "."));
  const method = String(formData.get("method") ?? "").trim() || null;
  if (!fundId || !Number.isFinite(amount) || amount <= 0) return;

  const [fund] = await db
    .select({ currency: funds.currency })
    .from(funds)
    .where(and(eq(funds.id, fundId), eq(funds.organizationId, ctx.organizationId)))
    .limit(1);
  if (!fund) return;

  const m = fromMajor(amount, fund.currency);
  await db.insert(donations).values({
    organizationId: ctx.organizationId,
    fundId,
    amountMinor: m.minor,
    currency: m.currency,
    method,
  });
  revalidatePath("/doacoes");
}
