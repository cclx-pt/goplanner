import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { campaigns, objectives, donations, funds } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { formatMoney } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createCampaignAction, createObjectiveAction } from "./actions";

function bar(raised: number, target: number) {
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return (
    <div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-brand-green" style={{ width: `${pct}%` }} /></div>
  );
}

export default async function CampanhasPage() {
  const st = await getAccessState();
  if (st.status !== "ok") redirect("/dashboard");
  const { ctx } = st; const org = ctx.organizationId;
  if (!(await canHere(ctx, "campanhas.campanha.ver", "campanhas"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "campanhas.campanha.gerir", "campanhas");
  const month = new Date().toISOString().slice(0, 7);

  const fnds = await db.select({ id: funds.id, name: funds.name }).from(funds).where(tenantFilter(funds, org)).orderBy(asc(funds.name));
  const camps = await db.select().from(campaigns).where(tenantFilter(campaigns, org));
  const objs = await db.select().from(objectives).where(and(tenantFilter(objectives, org), eq(objectives.month, month)));
  const raisedByFund = new Map<string, number>();
  for (const d of await db.select({ fundId: donations.fundId, sum: sql<number>`coalesce(sum(${donations.amountMinor}),0)` }).from(donations).where(tenantFilter(donations, org)).groupBy(donations.fundId)) raisedByFund.set(d.fundId, Number(d.sum));
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }} breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Campanhas" }]} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Campanhas e objetivos</h1>
        {canEdit && (
          <form action={createCampaignAction} className="mt-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <input name="name" required placeholder="Obras 2026" className={`flex-1 ${input}`} />
            <select name="fundId" required defaultValue="" className={input}><option value="" disabled>Categoria…</option>{fnds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <input name="target" required placeholder="Meta €" className={`w-28 ${input}`} />
            <select name="scope" defaultValue="org" className={input}><option value="org">Org</option><option value="community">Comunidade</option><option value="campus">Campus</option></select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="recurring" /> recorrente</label>
            <button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar</button>
          </form>
        )}
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {camps.length === 0 ? <li className="p-4 text-sm text-gray-400">Sem campanhas.</li> : camps.map((c) => {
            const raised = raisedByFund.get(c.fundId) ?? 0;
            return <li key={c.id} className="flex items-center gap-3 p-3 text-sm"><span className="w-40 font-medium text-brand-navy">{c.name}</span>{bar(raised, c.targetMinor)}<span className="w-40 text-right text-gray-500">{formatMoney({ minor: raised, currency: c.currency }, "pt-PT")} / {formatMoney({ minor: c.targetMinor, currency: c.currency }, "pt-PT")}</span></li>;
          })}
        </ul>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Objetivos do mês ({month})</h2>
        {canEdit && (
          <form action={createObjectiveAction} className="mt-2 flex flex-wrap gap-2"><select name="fundId" required defaultValue="" className={input}><option value="" disabled>Categoria…</option>{fnds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select><input name="month" defaultValue={month} className={`w-28 ${input}`} /><input name="target" required placeholder="Meta €" className={`w-28 ${input}`} /><button className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">Definir</button></form>
        )}
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {objs.length === 0 ? <li className="p-3 text-sm text-gray-400">Sem objetivos.</li> : objs.map((o) => { const r = raisedByFund.get(o.fundId) ?? 0; return <li key={o.id} className="flex items-center gap-3 p-3 text-sm"><span className="w-40">{fnds.find((f) => f.id === o.fundId)?.name}</span>{bar(r, o.targetMinor)}<span className="w-40 text-right text-gray-500">{formatMoney({ minor: r, currency: o.currency }, "pt-PT")} / {formatMoney({ minor: o.targetMinor, currency: o.currency }, "pt-PT")}</span></li>; })}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
