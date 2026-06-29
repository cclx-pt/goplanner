import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { transactions } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";

/**
 * Export SAF-T (PT) — base. Devolve os movimentos do tenant em CSV. O SAF-T real
 * é XML extenso; este é o ponto de partida (estrutura + dados consolidados).
 */
export async function GET() {
  const s = await getAccessState();
  if (s.status !== "ok") return new Response("403", { status: 403 });
  if (!(await canHere(s.ctx, "financas.financa.ver", "financas"))) return new Response("403", { status: 403 });

  const rows = await db
    .select({ id: transactions.id, type: transactions.type, amountMinor: transactions.amountMinor, currency: transactions.currency, category: transactions.category, occurredAt: transactions.occurredAt })
    .from(transactions)
    .where(tenantFilter(transactions, s.ctx.organizationId));

  const header = "id,type,amount_minor,currency,category,date";
  const body = rows.map((r) => [r.id, r.type, r.amountMinor, r.currency, r.category ?? "", r.occurredAt.toISOString()].join(",")).join("\n");
  return new Response(`${header}\n${body}\n`, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=saft-pt.csv" },
  });
}
