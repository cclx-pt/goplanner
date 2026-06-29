import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { events, eventRegistrations } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createEventAction, registerAction } from "./actions";

export default async function EventosPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "eventos.evento.ver", "eventos"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "eventos.evento.gerir", "eventos");

  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      location: events.location,
      capacity: events.capacity,
      regs: sql<number>`count(${eventRegistrations.id})`,
    })
    .from(events)
    .leftJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id))
    .where(tenantFilter(events, ctx.organizationId))
    .groupBy(events.id)
    .orderBy(asc(events.startsAt));

  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Eventos" }]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Eventos</h1>
        <p className="mt-1 text-sm text-gray-500">Eventos e inscrições (RSVP).</p>

        {canEdit && (
          <form action={createEventAction} className="mt-5 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <input name="name" required placeholder="Nome do evento" className={`flex-1 ${input}`} />
            <input name="location" placeholder="Local" className={input} />
            <input name="capacity" type="number" placeholder="Lotação" className={`w-28 ${input}`} />
            <button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar</button>
          </form>
        )}

        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {rows.length === 0 ? (
            <li className="p-4 text-sm text-gray-400">Sem eventos.</li>
          ) : (
            rows.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <div className="text-sm font-medium text-brand-navy">{e.name}</div>
                  <div className="text-xs text-gray-400">
                    {e.location ?? "sem local"} · {Number(e.regs)} inscrito(s)
                    {e.capacity ? ` / ${e.capacity}` : ""}
                  </div>
                </div>
                {canEdit && (
                  <form action={registerAction} className="flex gap-1">
                    <input type="hidden" name="eventId" value={e.id} />
                    <input name="name" placeholder="Inscrever nome" className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs" />
                    <button className="rounded-md bg-brand-blue px-3 py-1 text-xs font-medium text-white">+</button>
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
