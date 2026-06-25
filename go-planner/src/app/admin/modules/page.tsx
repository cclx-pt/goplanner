import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { modules, organizationModules } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { setModuleActiveAction } from "./actions";

export default async function ModulesPage() {
  const ctx = await requireOrgAdmin();
  const rows = await db
    .select({
      orgModuleId: organizationModules.id,
      active: organizationModules.active,
      key: modules.key,
      name: modules.name,
    })
    .from(organizationModules)
    .innerJoin(modules, eq(organizationModules.moduleId, modules.id))
    .where(eq(organizationModules.organizationId, ctx.organizationId))
    .orderBy(asc(modules.name));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Módulos</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ativa ou desativa módulos nesta organização. Desativar arquiva — nunca
        apaga dados.
      </p>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-gray-500">
            Nenhum módulo registado para esta organização.
          </li>
        ) : (
          rows.map((m) => (
            <li key={m.orgModuleId} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-brand-navy">{m.name}</div>
                <div className="text-xs text-gray-400">{m.key}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    m.active
                      ? "text-xs font-medium text-brand-green"
                      : "text-xs font-medium text-gray-400"
                  }
                >
                  {m.active ? "Ativo" : "Inativo"}
                </span>
                <form action={setModuleActiveAction}>
                  <input type="hidden" name="orgModuleId" value={m.orgModuleId} />
                  <input type="hidden" name="active" value={String(!m.active)} />
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
                  >
                    {m.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
