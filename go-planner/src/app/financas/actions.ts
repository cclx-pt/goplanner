"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, accounts, transactions } from "@/core/db/schema";
import { fromMajor } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";

async function ctxFor(permission: string) {
  const s = await getAccessState();
  if (s.status !== "ok") return null;
  if (!(await canHere(s.ctx, permission, "financas"))) return null;
  return s.ctx;
}

/** Define o modelo financeiro da organização: global ou autonomous. */
export async function setFinanceModelAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("financas.financa.gerir");
  if (!ctx) return;
  const model = String(formData.get("model") ?? "");
  if (model !== "global" && model !== "autonomous") return;
  await db.update(organizations).set({ financeModel: model }).where(eq(organizations.id, ctx.organizationId));
  revalidatePath("/financas");
}

/** Cria conta ao nível da org (communityId vazio) ou de uma comunidade. */
export async function createAccountAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("financas.financa.gerir");
  if (!ctx) return;
  const name = String(formData.get("name") ?? "").trim();
  const communityId = String(formData.get("communityId") ?? "") || null;
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  if (!name) return;
  await db.insert(accounts).values({ organizationId: ctx.organizationId, communityId, name, currency });
  revalidatePath("/financas");
}

/** Regista um movimento (receita/despesa) numa conta. */
export async function recordTransactionAction(formData: FormData): Promise<void> {
  const ctx = await ctxFor("financas.financa.gerir");
  if (!ctx) return;
  const accountId = String(formData.get("accountId") ?? "");
  const type = String(formData.get("type") ?? "income");
  const amount = parseFloat(String(formData.get("amount") ?? "").replace(",", "."));
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!accountId || !["income", "expense"].includes(type) || !Number.isFinite(amount) || amount <= 0) return;
  const [acc] = await db
    .select({ currency: accounts.currency, communityId: accounts.communityId })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.organizationId, ctx.organizationId)))
    .limit(1);
  if (!acc) return;
  const m = fromMajor(amount, acc.currency);
  await db.insert(transactions).values({
    organizationId: ctx.organizationId,
    communityId: acc.communityId,
    accountId,
    type,
    amountMinor: m.minor,
    currency: m.currency,
    category,
  });
  revalidatePath("/financas");
}
