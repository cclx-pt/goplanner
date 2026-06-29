"use server";

import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, communities, funds, donations, people } from "@/core/db/schema";
import { fromMajor } from "@/core/money";
import { getAccessState } from "@/core/access/context";
import { initiateDonationPayment } from "@/core/payments/ifthenpay";

/** Org pública por defeito: a primeira (single-tenant CCLX). */
export async function publicOrg() {
  const [o] = await db.select({ id: organizations.id, name: organizations.name, currency: organizations.currency }).from(organizations).orderBy(asc(organizations.createdAt)).limit(1);
  return o ?? null;
}

/** Donativo PÚBLICO (sem login). Se logado, liga ao person. Inicia ifthenpay. */
export async function createPublicDonationAction(formData: FormData): Promise<void> {
  const org = await publicOrg();
  if (!org) return;
  const amount = parseFloat(String(formData.get("amount") ?? "").replace(",", "."));
  const fundId = String(formData.get("fundId") ?? "");
  const communityId = String(formData.get("communityId") ?? "") || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!Number.isFinite(amount) || amount <= 0 || !fundId) return;

  const [fund] = await db.select({ currency: funds.currency }).from(funds).where(eq(funds.id, fundId)).limit(1);
  if (!fund) return;

  const session = await getAccessState();
  const personId = session.status === "ok" ? session.ctx.personId : null;
  const m = fromMajor(amount, fund.currency);
  const [d] = await db.insert(donations).values({
    organizationId: org.id, personId: personId ?? null, fundId, communityId,
    amountMinor: m.minor, currency: m.currency, method: "mbway",
    recurrence: formData.get("recurrence") ? "monthly" : "none", status: "pending",
    donorPhone: phone, donorNif: String(formData.get("nif") ?? "").trim() || null,
    donorEmail: String(formData.get("email") ?? "").trim() || null, donorName: String(formData.get("name") ?? "").trim() || null,
  }).returning({ id: donations.id });

  await initiateDonationPayment(org.id, { ref: d.id, amountMinor: m.minor, currency: m.currency, phone, fund: fundId, community: communityId });
  redirect("/contribuir/obrigado");
}
