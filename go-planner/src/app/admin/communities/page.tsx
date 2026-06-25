import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { communities } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { createCommunityAction } from "./actions";

export default async function CommunitiesPage() {
  const ctx = await requireOrgAdmin();
  const rows = await db
    .select()
    .from(communities)
    .where(eq(communities.organizationId, ctx.organizationId))
    .orderBy(asc(communities.name));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Comunidades</h1>
      <p className="mt-1 text-sm text-gray-500">
        As comunidades são o âmbito dos acessos e dos dados dos módulos.
      </p>

      <form
        action={createCommunityAction}
        className="mt-5 flex gap-2"
      >
        <input
          name="name"
          required
          placeholder="Nome da comunidade"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-gray-500">Ainda não há comunidades.</li>
        ) : (
          rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-4">
              <span className="text-sm font-medium text-brand-navy">{c.name}</span>
              <span className="text-xs text-gray-400">
                {c.createdAt.toLocaleDateString("pt-PT")}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
