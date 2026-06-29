import { redirect } from "next/navigation";
import { asc, desc, eq, and, isNull } from "drizzle-orm";
import { db } from "@/core/db";
import { checkinEvents, checkins, people } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createEventAction, checkInAction, checkOutAction } from "./actions";

export default async function CheckinPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "checkin.checkin.ver", "checkin"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "checkin.checkin.registar", "checkin");

  const events = await db
    .select({ id: checkinEvents.id, name: checkinEvents.name })
    .from(checkinEvents)
    .where(and(tenantFilter(checkinEvents, ctx.organizationId), eq(checkinEvents.active, true)))
    .orderBy(desc(checkinEvents.occurredAt));

  const personRows = await db
    .select({ id: people.id, name: people.name, email: people.email })
    .from(people)
    .where(tenantFilter(people, ctx.organizationId))
    .orderBy(asc(people.name));

  const present = await db
    .select({ id: checkins.id, person: people.name, code: checkins.code, since: checkins.checkedInAt })
    .from(checkins)
    .innerJoin(people, eq(checkins.personId, people.id))
    .where(and(tenantFilter(checkins, ctx.organizationId), isNull(checkins.checkedOutAt)))
    .orderBy(desc(checkins.checkedInAt));

  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Check-in" }]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Check-in</h1>
        <p className="mt-1 text-sm text-gray-500">
          Código de segurança gerado no check-in — obrigatório na recolha.
        </p>

        {canEdit && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <form action={createEventAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Nova sessão</h2>
              <div className="mt-2 flex gap-2">
                <input name="name" required placeholder="Culto domingo" className={`flex-1 ${input}`} />
                <button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar</button>
              </div>
            </form>
            <form action={checkInAction} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Check-in</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select name="eventId" required defaultValue="" className={input}>
                  <option value="" disabled>Sessão…</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select name="personId" required defaultValue="" className={input}>
                  <option value="" disabled>Pessoa…</option>
                  {personRows.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.email}</option>)}
                </select>
              </div>
              <button className="mt-3 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">Check-in</button>
            </form>
          </div>
        )}

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Presentes</h2>
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {present.length === 0 ? (
            <li className="p-4 text-sm text-gray-400">Ninguém em check-in.</li>
          ) : (
            present.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3">
                <span className="text-sm text-brand-navy">{c.person ?? "—"}</span>
                {canEdit && (
                  <form action={checkOutAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="code" placeholder="código" className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs" />
                    <button className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white">Recolher</button>
                  </form>
                )}
              </li>
            ))
          )}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
