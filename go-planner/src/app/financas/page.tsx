import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, communities, accounts, transactions } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { formatMoney } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { setFinanceModelAction, createAccountAction, recordTransactionAction } from "./actions";

export default async function FinancasPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "financas.financa.ver", "financas"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "financas.financa.gerir", "financas");

  const [org] = await db
    .select({ model: organizations.financeModel, currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1);
  const cur = org?.currency ?? "EUR";

  const comms = await db
    .select({ id: communities.id, name: communities.name })
    .from(communities)
    .where(tenantFilter(communities, ctx.organizationId))
    .orderBy(asc(communities.name));

  const accs = await db
    .select({ id: accounts.id, name: accounts.name, communityId: accounts.communityId })
    .from(accounts)
    .where(tenantFilter(accounts, ctx.organizationId));

  const txs = await db
    .select({ communityId: transactions.communityId, type: transactions.type, amount: transactions.amountMinor })
    .from(transactions)
    .where(tenantFilter(transactions, ctx.organizationId));

  const net = (communityId: string | null) =>
    txs.filter((t) => t.communityId === communityId).reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const consolidated = txs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const commName = (id: string | null) => comms.find((c) => c.id === id)?.name ?? "Organização";
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Finanças" }]} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Finanças</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modelo: <strong>{org?.model === "autonomous" ? "comunidades autónomas" : "global (org + sub-contas)"}</strong>.
          Consolidado: <span className="text-brand-green">{formatMoney({ minor: consolidated, currency: cur }, "pt-PT")}</span>
        </p>
        <a href="/api/saft" className="mt-2 inline-block text-xs font-medium text-brand-blue hover:underline">Exportar SAF-T (PT) ↓</a>

        {canEdit && (
          <form action={setFinanceModelAction} className="mt-3 flex items-center gap-2">
            <select name="model" defaultValue={org?.model ?? "global"} className={input}>
              <option value="global">Global (org + sub-contas por comunidade)</option>
              <option value="autonomous">Comunidades autónomas e independentes</option>
            </select>
            <button className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-brand-navy hover:bg-gray-50">Definir modelo</button>
          </form>
        )}

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Saldo por perspetiva</h2>
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          <li className="flex justify-between p-3 text-sm"><span className="font-medium text-brand-navy">Organização</span><span>{formatMoney({ minor: net(null), currency: cur }, "pt-PT")}</span></li>
          {comms.map((c) => (
            <li key={c.id} className="flex justify-between p-3 text-sm"><span className="text-brand-navy">{c.name}</span><span>{formatMoney({ minor: net(c.id), currency: cur }, "pt-PT")}</span></li>
          ))}
        </ul>

        {canEdit && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <form action={createAccountAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Nova conta</h2>
              <input name="name" required placeholder="Conta geral" className={`mt-2 w-full ${input}`} />
              <select name="communityId" defaultValue="" className={`mt-2 w-full ${input}`}>
                <option value="">Organização</option>
                {comms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="mt-3 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar conta</button>
            </form>
            <form action={recordTransactionAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Movimento</h2>
              <select name="accountId" required defaultValue="" className={`mt-2 w-full ${input}`}>
                <option value="" disabled>Conta…</option>
                {accs.map((a) => <option key={a.id} value={a.id}>{a.name} · {commName(a.communityId)}</option>)}
              </select>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <select name="type" className={input}><option value="income">Receita</option><option value="expense">Despesa</option></select>
                <input name="amount" placeholder="100,00" className={input} />
                <input name="category" placeholder="Categoria" className={input} />
              </div>
              <button className="mt-3 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">Registar</button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
