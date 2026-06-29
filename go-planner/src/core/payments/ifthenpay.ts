import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { paymentConfigs } from "@/core/db/schema";

/**
 * Pagamentos ifthenpay. Config por tenant (chaves no `payment_configs`). Se MB
 * WAY ativo, chama a API; senão tenta o webhook Pipedream; senão fica pendente.
 * Defensivo: nunca quebra o fluxo de doação.
 */
export interface DonationIntent {
  ref: string;
  amountMinor: number;
  currency: string;
  phone?: string | null;
  fund?: string | null;
  community?: string | null;
}

export async function getPaymentConfig(orgId: string) {
  const [c] = await db.select().from(paymentConfigs).where(eq(paymentConfigs.organizationId, orgId)).limit(1);
  return c ?? null;
}

const eur = (minor: number) => (minor / 100).toFixed(2);
const intl = (p?: string | null) => (p ? (p.includes("#") ? p : `351#${p}`) : "");

export async function initiateDonationPayment(orgId: string, intent: DonationIntent): Promise<boolean> {
  try {
    const cfg = await getPaymentConfig(orgId);
    if (cfg?.active && cfg.mbwayKey && intent.phone) {
      const base = cfg.sandbox
        ? "https://api.ifthenpay.com/spg/payment/mbway/sandbox"
        : "https://api.ifthenpay.com/spg/payment/mbway";
      const r = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mbWayKey: cfg.mbwayKey, orderId: intent.ref.slice(0, 15), amount: eur(intent.amountMinor), mobileNumber: intl(intent.phone), description: "Donativo" }),
      });
      return r.ok;
    }
    const url = process.env.IFTHENPAY_PIPEDREAM_URL;
    if (url) {
      await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(intent) });
      return true;
    }
    return false; // não configurado: doação fica pendente, sem cobrança
  } catch {
    return false; // nunca quebrar o fluxo de doação
  }
}
