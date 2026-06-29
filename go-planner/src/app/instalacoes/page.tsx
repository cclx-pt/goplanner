import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { rooms, bookings } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createRoomAction, createBookingAction } from "./actions";

export default async function InstalacoesPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "instalacoes.sala.ver", "instalacoes"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "instalacoes.sala.gerir", "instalacoes");
  const rms = await db.select().from(rooms).where(tenantFilter(rooms, ctx.organizationId)).orderBy(asc(rooms.name));
  const bks = await db.select({ id: bookings.id, title: bookings.title, room: rooms.name, startsAt: bookings.startsAt })
    .from(bookings).innerJoin(rooms, eq(bookings.roomId, rooms.id)).where(tenantFilter(bookings, ctx.organizationId)).orderBy(desc(bookings.startsAt)).limit(20);
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }} breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Instalações" }]} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Instalações</h1>
        <p className="mt-1 text-sm text-gray-500">Salas e reservas (sem dupla marcação).</p>
        {canEdit && (<div className="mt-5 grid gap-4 sm:grid-cols-2">
          <form action={createRoomAction} className="rounded-lg border border-gray-200 bg-white p-4"><h2 className="text-sm font-semibold text-brand-navy">Nova sala</h2><div className="mt-2 flex gap-2"><input name="name" required placeholder="Sala principal" className={`flex-1 ${input}`} /><button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar</button></div></form>
          <form action={createBookingAction} className="rounded-lg border border-gray-200 bg-white p-4"><h2 className="text-sm font-semibold text-brand-navy">Reserva</h2><select name="roomId" required defaultValue="" className={`mt-2 w-full ${input}`}><option value="" disabled>Sala…</option>{rms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><input name="title" required placeholder="Motivo" className={`mt-2 w-full ${input}`} /><div className="mt-2 grid grid-cols-2 gap-2"><input name="startsAt" type="datetime-local" required className={input} /><input name="endsAt" type="datetime-local" required className={input} /></div><button className="mt-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">Reservar</button></form>
        </div>)}
        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">{bks.length === 0 ? <li className="p-4 text-sm text-gray-400">Sem reservas.</li> : bks.map((b) => <li key={b.id} className="p-3 text-sm"><span className="font-medium text-brand-navy">{b.room}</span> · {b.title} · {b.startsAt.toLocaleString("pt-PT")}</li>)}</ul>
      </main>
      <Footer />
    </div>
  );
}
