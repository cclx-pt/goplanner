import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { funds, donations } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { formatMoney } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createFundAction, recordDonationAction } from "./actions";

export default async function DoacoesPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "doacoes.doacao.ver", "doacoes"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "doacoes.doacao.registar", "doacoes");

  const fundRows = await db
    .select({
      id: funds.id,
      name: funds.name,
      currency: funds.currency,
      total: sql<number>`coalesce(sum(${donations.amountMinor}), 0)`,
    })
    .from(funds)
    .leftJoin(donations, eq(donations.fundId, funds.id))
    .where(tenantFilter(funds, ctx.organizationId))
    .groupBy(funds.id)
    .orderBy(asc(funds.name));

  const input =
    "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[
          { label: ctx.organizationName, href: "/dashboard" },
          { label: "Doações" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Doações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fundos e totais. Dinheiro em unidades menores + ISO 4217.
        </p>

        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {fundRows.length === 0 ? (
            <li className="p-4 text-sm text-gray-400">Sem fundos.</li>
          ) : (
            fundRows.map((f) => (
              <li key={f.id} className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-brand-navy">{f.name}</span>
                <span className="text-sm text-brand-green">
                  {formatMoney({ minor: Number(f.total), currency: f.currency }, "pt-PT")}
                </span>
              </li>
            ))
          )}
        </ul>

        {canEdit && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <form action={createFundAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Novo fundo</h2>
              <div className="mt-2 flex gap-2">
                <input name="name" required placeholder="Dízimos" className={`flex-1 ${input}`} />
                <input name="currency" defaultValue="EUR" className={`w-20 uppercase ${input}`} />
              </div>
              <button className="mt-3 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">
                Criar fundo
              </button>
            </form>
            <form action={recordDonationAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Registar doação</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select name="fundId" required defaultValue="" className={input}>
                  <option value="" disabled>Fundo…</option>
                  {fundRows.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input name="amount" required placeholder="10,50" className={input} />
                <input name="method" placeholder="mbway / dinheiro" className={`col-span-2 ${input}`} />
              </div>
              <button className="mt-3 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">
                Registar
              </button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
