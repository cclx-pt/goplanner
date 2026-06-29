import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/core/db";
import { missionaries } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createMissionaryAction } from "./actions";

export default async function MissoesPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "missoes.missao.ver", "missoes"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "missoes.missao.gerir", "missoes");
  const rows = await db.select().from(missionaries).where(tenantFilter(missionaries, ctx.organizationId)).orderBy(asc(missionaries.name));
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }} breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Missões" }]} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Missões</h1>
        <p className="mt-1 text-sm text-gray-500">Missionários e campos de suporte.</p>
        {canEdit && (<form action={createMissionaryAction} className="mt-5 flex gap-2"><input name="name" required placeholder="Nome" className={`flex-1 ${input}`} /><input name="field" placeholder="Campo / país" className={input} /><button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Adicionar</button></form>)}
        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">{rows.length === 0 ? <li className="p-4 text-sm text-gray-400">Sem missionários.</li> : rows.map((m) => <li key={m.id} className="p-3 text-sm"><span className="font-medium text-brand-navy">{m.name}</span>{m.field ? ` · ${m.field}` : ""}</li>)}</ul>
      </main>
      <Footer />
    </div>
  );
}
