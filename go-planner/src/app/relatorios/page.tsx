import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/core/db";
import { people, donations, groups, groupMembers, events, checkins } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { formatMoney } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

const STAGES: [string, string][] = [
  ["visitor", "Visitantes"],
  ["first_timer", "1.ª vez"],
  ["regular", "Frequentes"],
  ["member", "Membros"],
  ["leader", "Líderes"],
];

export default async function RelatoriosPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "relatorios.painel.ver", "relatorios"))) redirect("/dashboard");
  const org = ctx.organizationId;

  const [stages, [donTot], [grpC], [evtC], [presentC]] = await Promise.all([
    db.select({ stage: people.lifecycleStage, n: sql<number>`count(*)` }).from(people).where(tenantFilter(people, org)).groupBy(people.lifecycleStage),
    db.select({ total: sql<number>`coalesce(sum(${donations.amountMinor}),0)` }).from(donations).where(tenantFilter(donations, org)),
    db.select({ n: sql<number>`count(*)` }).from(groups).where(tenantFilter(groups, org)),
    db.select({ n: sql<number>`count(*)` }).from(events).where(tenantFilter(events, org)),
    db.select({ n: sql<number>`count(*)` }).from(checkins).where(tenantFilter(checkins, org)),
  ]);
  const stageN = (s: string) => Number(stages.find((r) => r.stage === s)?.n ?? 0);
  const totalPeople = stages.reduce((a, r) => a + Number(r.n), 0);

  // Engagement: pessoas sem grupo, sem doações e sem check-in = em risco.
  const ppl = await db.select({ id: people.id, name: people.name, email: people.email }).from(people).where(tenantFilter(people, org));
  const inG = new Set((await db.select({ p: groupMembers.personId }).from(groupMembers).where(tenantFilter(groupMembers, org))).map((r) => r.p));
  const inD = new Set((await db.select({ p: donations.personId }).from(donations).where(tenantFilter(donations, org))).map((r) => r.p));
  const inC = new Set((await db.select({ p: checkins.personId }).from(checkins).where(tenantFilter(checkins, org))).map((r) => r.p));
  const atRisk = ppl.filter((p) => !inG.has(p.id) && !inD.has(p.id) && !inC.has(p.id));

  const kpis = [
    { label: "Pessoas", value: String(totalPeople), color: "text-brand-navy" },
    { label: "Doações (total)", value: formatMoney({ minor: Number(donTot?.total ?? 0), currency: "EUR" }, "pt-PT"), color: "text-brand-green" },
    { label: "Grupos", value: String(grpC?.n ?? 0), color: "text-brand-blue" },
    { label: "Eventos", value: String(evtC?.n ?? 0), color: "text-brand-purple" },
    { label: "Check-ins", value: String(presentC?.n ?? 0), color: "text-brand-navy" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Relatórios" }]} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">KPIs e funil de discipulado.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="mt-1 text-xs font-medium text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Funil de discipulado</h2>
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {STAGES.map(([key, label]) => {
            const n = stageN(key);
            const pct = totalPeople ? Math.round((n / totalPeople) * 100) : 0;
            return (
              <li key={key} className="flex items-center gap-3 p-3">
                <span className="w-24 text-sm text-brand-navy">{label}</span>
                <div className="h-2 flex-1 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-16 text-right text-sm text-gray-500">{n} · {pct}%</span>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Engagement — em risco</h2>
        <p className="mt-1 text-xs text-gray-400">Sem grupo, sem doações e sem check-in (sinal de afastamento).</p>
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {atRisk.length === 0 ? <li className="p-3 text-sm text-gray-400">Ninguém em risco.</li> :
            atRisk.slice(0, 10).map((p) => <li key={p.id} className="p-3 text-sm text-brand-navy">{p.name ?? p.email ?? "—"}</li>)}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
