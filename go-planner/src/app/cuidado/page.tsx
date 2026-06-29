import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/core/db";
import { prayerRequests, careCases } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createPrayerAction, createCareAction } from "./actions";

const VIS: Record<string, string> = { public: "Mural", private: "Privado", confidential: "Confidencial" };
const TYPES: Record<string, string> = { visit: "Visita", hospital: "Hospital", bereavement: "Luto", counselling: "Aconselhamento" };

export default async function CuidadoPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "cuidado.cuidado.ver", "cuidado"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "cuidado.cuidado.gerir", "cuidado");

  const prayers = await db.select().from(prayerRequests).where(tenantFilter(prayerRequests, ctx.organizationId)).orderBy(desc(prayerRequests.createdAt)).limit(20);
  const cases = await db.select().from(careCases).where(tenantFilter(careCases, ctx.organizationId)).orderBy(desc(careCases.createdAt)).limit(20);
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Cuidado" }]} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Cuidado</h1>
        <p className="mt-1 text-sm text-gray-500">Oração e cuidado pastoral. Notas confidenciais com acesso restrito.</p>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Mural de oração</h2>
            {canEdit && (
              <form action={createPrayerAction} className="mt-2 flex gap-2">
                <input name="title" required placeholder="Pedido de oração" className={`flex-1 ${input}`} />
                <select name="visibility" defaultValue="public" className={input}>
                  <option value="public">Mural</option><option value="private">Privado</option><option value="confidential">Confidencial</option>
                </select>
                <button className="rounded-md bg-brand-blue px-3 py-2 text-xs font-medium text-white">+</button>
              </form>
            )}
            <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {prayers.length === 0 ? <li className="p-3 text-xs text-gray-400">Sem pedidos.</li> :
                prayers.map((p) => <li key={p.id} className="p-3 text-sm"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{VIS[p.visibility] ?? p.visibility}</span> {p.title}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Casos de cuidado</h2>
            {canEdit && (
              <form action={createCareAction} className="mt-2 flex gap-2">
                <select name="type" defaultValue="visit" className={input}>
                  <option value="visit">Visita</option><option value="hospital">Hospital</option><option value="bereavement">Luto</option><option value="counselling">Aconselhamento</option>
                </select>
                <input name="note" required placeholder="Nota" className={`flex-1 ${input}`} />
                <button className="rounded-md bg-brand-green px-3 py-2 text-xs font-medium text-white">+</button>
              </form>
            )}
            <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {cases.length === 0 ? <li className="p-3 text-xs text-gray-400">Sem casos.</li> :
                cases.map((c) => <li key={c.id} className="p-3 text-sm"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{TYPES[c.type] ?? c.type}</span> {c.note}</li>)}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
