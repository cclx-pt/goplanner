"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { paymentConfigs } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

const keep = (cur: string | null, val: string) => (val === "" ? cur : val); // "" mantém, senão substitui

/** Guarda a config ifthenpay do tenant (campos vazios mantêm o valor atual). */
export async function savePaymentConfigAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const v = (k: string) => String(formData.get(k) ?? "").trim();
  const [cur] = await db.select().from(paymentConfigs).where(eq(paymentConfigs.organizationId, ctx.organizationId)).limit(1);
  const data = {
    gatewayKey: keep(cur?.gatewayKey ?? null, v("gatewayKey")),
    mbwayKey: keep(cur?.mbwayKey ?? null, v("mbwayKey")),
    mbKey: keep(cur?.mbKey ?? null, v("mbKey")),
    backofficeKey: keep(cur?.backofficeKey ?? null, v("backofficeKey")),
    antiPhishingKey: keep(cur?.antiPhishingKey ?? null, v("antiPhishingKey")),
    defaultMethod: v("defaultMethod") || "mbway",
    sandbox: formData.get("sandbox") != null,
    active: formData.get("active") != null,
    updatedAt: new Date(),
  };
  if (cur) await db.update(paymentConfigs).set(data).where(eq(paymentConfigs.organizationId, ctx.organizationId));
  else await db.insert(paymentConfigs).values({ organizationId: ctx.organizationId, ...data });
  revalidatePath("/admin/pagamentos");
}
