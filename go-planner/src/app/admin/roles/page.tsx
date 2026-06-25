import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/core/db";
import { roles } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { createRoleAction } from "./actions";

export default async function RolesPage() {
  const ctx = await requireOrgAdmin();
  const rows = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, ctx.organizationId))
    .orderBy(asc(roles.name));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Roles</h1>
      <p className="mt-1 text-sm text-gray-500">
        Um role é um pacote de permissões. O admin da organização ignora
        permissões (acesso total).
      </p>

      <form action={createRoleAction} className="mt-5 flex gap-2">
        <input
          name="name"
          required
          placeholder="Nome do role (ex.: Líder de louvor)"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Criar role
        </button>
      </form>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-navy">{r.name}</span>
              {r.isOrgAdmin && (
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                  admin da organização
                </span>
              )}
            </div>
            {r.isOrgAdmin ? (
              <span className="text-xs text-gray-400">acesso total</span>
            ) : (
              <Link
                href={`/admin/roles/${r.id}`}
                className="text-sm font-medium text-brand-blue hover:underline"
              >
                Permissões →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
