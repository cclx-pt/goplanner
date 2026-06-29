import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, communities, people } from "@/core/db/schema";
import { manageOrgAction } from "@/app/admin/actions";
import { createOrganizationAction } from "./actions";
import { requirePlatformAdmin } from "../guard";

export default async function PlatformOrganizationsPage() {
  await requirePlatformAdmin();

  const [orgs, commCounts, peopleCounts] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(asc(organizations.createdAt)),
    db
      .select({ organizationId: communities.organizationId, value: count() })
      .from(communities)
      .groupBy(communities.organizationId),
    db
      .select({ organizationId: people.organizationId, value: count() })
      .from(people)
      .groupBy(people.organizationId),
  ]);

  const commMap = new Map(commCounts.map((r) => [r.organizationId, r.value]));
  const peopleMap = new Map(peopleCounts.map((r) => [r.organizationId, r.value]));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Organizações</h1>
      <p className="mt-1 text-sm text-gray-500">
        Todos os tenants da plataforma — {orgs.length} no total.
      </p>

      <form action={createOrganizationAction} className="mt-5 flex gap-2">
        <input
          name="name"
          required
          placeholder="Nome da nova organização"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Criar organização
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Organização</th>
              <th className="px-4 py-2 font-medium">Comunidades</th>
              <th className="px-4 py-2 font-medium">Pessoas</th>
              <th className="px-4 py-2 font-medium">Criada</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-gray-500">
                  Ainda não há organizações.
                </td>
              </tr>
            ) : (
              orgs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {o.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {commMap.get(o.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {peopleMap.get(o.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {o.createdAt.toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <form action={manageOrgAction}>
                        <input type="hidden" name="orgId" value={o.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-brand-navy transition hover:bg-gray-50"
                        >
                          Gerir →
                        </button>
                      </form>
                      <Link
                        href={`/platform/organizations/${o.id}`}
                        className="rounded-md px-3 py-1 text-xs font-medium text-brand-blue hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
