import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/core/db";
import { groups, groupMembers, people } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createGroupAction, addGroupMemberAction } from "./actions";

const TYPES: Record<string, string> = {
  cell: "Célula",
  life_group: "Grupo de vida",
  class: "Classe",
  board: "Conselho",
};

export default async function GruposPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "grupos.grupo.ver", "grupos"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "grupos.grupo.gerir", "grupos");

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      type: groups.type,
      count: sql<number>`count(${groupMembers.personId})`,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(tenantFilter(groups, ctx.organizationId))
    .groupBy(groups.id)
    .orderBy(asc(groups.name));

  const personRows = await db
    .select({ id: people.id, name: people.name, email: people.email })
    .from(people)
    .where(tenantFilter(people, ctx.organizationId))
    .orderBy(asc(people.name));

  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Grupos" }]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Grupos</h1>
        <p className="mt-1 text-sm text-gray-500">Células e grupos — roster e multiplicação.</p>

        {canEdit && (
          <form action={createGroupAction} className="mt-5 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <input name="name" required placeholder="Nome do grupo" className={`flex-1 ${input}`} />
            <select name="type" defaultValue="cell" className={input}>
              <option value="cell">Célula</option>
              <option value="life_group">Grupo de vida</option>
              <option value="class">Classe</option>
              <option value="board">Conselho</option>
            </select>
            <button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Criar</button>
          </form>
        )}

        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {rows.length === 0 ? (
            <li className="p-4 text-sm text-gray-400">Sem grupos.</li>
          ) : (
            rows.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <div className="text-sm font-medium text-brand-navy">{g.name}</div>
                  <div className="text-xs text-gray-400">
                    {TYPES[g.type] ?? g.type} · {Number(g.count)} membro(s)
                  </div>
                </div>
                {canEdit && (
                  <form action={addGroupMemberAction} className="flex gap-1">
                    <input type="hidden" name="groupId" value={g.id} />
                    <select name="personId" defaultValue="" className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                      <option value="" disabled>Adicionar…</option>
                      {personRows.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.email}</option>)}
                    </select>
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
