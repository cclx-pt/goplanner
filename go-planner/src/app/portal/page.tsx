import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { people, groups, groupMembers, events, prayerRequests, donations } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { SignOutButton } from "@/components/SignOutButton";

const STAGES: Record<string, string> = { visitor: "Visitante", first_timer: "1.ª vez", regular: "Frequente", member: "Membro", leader: "Líder" };

/** Portal do MEMBRO — self-service sobre a espinha (mesma base de dados). */
export default async function PortalPage() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  const { ctx } = state;
  const org = ctx.organizationId;

  const me = ctx.personId
    ? (await db.select({ name: people.name, email: people.email, stage: people.lifecycleStage }).from(people).where(eq(people.id, ctx.personId)).limit(1))[0]
    : null;
  const myGroups = ctx.personId
    ? await db.select({ name: groups.name }).from(groupMembers).innerJoin(groups, eq(groupMembers.groupId, groups.id)).where(eq(groupMembers.personId, ctx.personId))
    : [];
  const [myGiving] = ctx.personId
    ? await db.select({ n: sql<number>`count(*)` }).from(donations).where(and(tenantFilter(donations, org), eq(donations.personId, ctx.personId)))
    : [{ n: 0 }];
  const upcoming = await db.select({ id: events.id, name: events.name }).from(events).where(tenantFilter(events, org)).orderBy(desc(events.startsAt)).limit(5);
  const wall = await db.select({ id: prayerRequests.id, title: prayerRequests.title }).from(prayerRequests).where(and(tenantFilter(prayerRequests, org), eq(prayerRequests.visibility, "public"))).orderBy(desc(prayerRequests.createdAt)).limit(8);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Portal", href: "/portal" }]} user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/portal" }, { label: "Portal do membro" }]} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <h1 className="text-2xl font-bold text-brand-navy">Olá{me?.name ? `, ${me.name}` : ""}.</h1>
        <p className="mt-1 text-sm text-gray-500">{me ? STAGES[me.stage] ?? me.stage : "Membro"} · {ctx.organizationName} · {Number(myGiving?.n ?? 0)} doação(ões)</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-brand-navy">Os meus grupos</h2>
            <ul className="mt-2 text-sm text-gray-600">{myGroups.length ? myGroups.map((g, i) => <li key={i}>{g.name}</li>) : <li className="text-gray-400">Sem grupos.</li>}</ul>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-brand-navy">Próximos eventos</h2>
            <ul className="mt-2 text-sm text-gray-600">{upcoming.length ? upcoming.map((e) => <li key={e.id}>{e.name}</li>) : <li className="text-gray-400">Sem eventos.</li>}</ul>
          </section>
        </div>
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-brand-navy">Mural de oração</h2>
          <ul className="mt-2 text-sm text-gray-600">{wall.length ? wall.map((p) => <li key={p.id}>{p.title}</li>) : <li className="text-gray-400">Sem pedidos.</li>}</ul>
        </section>
        <div className="mt-5"><SignOutButton /></div>
      </main>
      <Footer />
    </div>
  );
}
