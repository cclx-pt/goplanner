import { desc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { workflows, workflowRuns } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { requireOrgAdmin } from "../guard";
import { toggleWorkflowAction } from "./actions";

export default async function WorkflowsPage() {
  const ctx = await requireOrgAdmin();

  const wfs = await db
    .select()
    .from(workflows)
    .where(tenantFilter(workflows, ctx.organizationId));

  const runs = await db
    .select({
      id: workflowRuns.id,
      trigger: workflowRuns.trigger,
      status: workflowRuns.status,
      detail: workflowRuns.detail,
      createdAt: workflowRuns.createdAt,
    })
    .from(workflowRuns)
    .where(tenantFilter(workflowRuns, ctx.organizationId))
    .orderBy(desc(workflowRuns.createdAt))
    .limit(10);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Workflows</h1>
      <p className="mt-1 text-sm text-gray-500">
        Automações trigger → condição → ação. Reagem a eventos do sistema.
      </p>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {wfs.length === 0 ? (
          <li className="p-4 text-sm text-gray-400">Sem workflows.</li>
        ) : (
          wfs.map((w) => (
            <li key={w.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-brand-navy">{w.name}</div>
                <div className="text-xs text-gray-400">
                  trigger: {w.trigger} ·{" "}
                  {Array.isArray(w.actions) ? w.actions.length : 0} ação(ões)
                </div>
              </div>
              <form action={toggleWorkflowAction}>
                <input type="hidden" name="id" value={w.id} />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    w.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {w.active ? "ativo" : "inativo"}
                </button>
              </form>
            </li>
          ))
        )}
      </ul>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Execuções recentes
      </h2>
      <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {runs.length === 0 ? (
          <li className="p-4 text-xs text-gray-400">Ainda sem execuções.</li>
        ) : (
          runs.map((r) => (
            <li key={r.id} className="p-3 text-xs">
              <span className="font-medium text-brand-navy">{r.trigger}</span> ·{" "}
              {r.status} · {r.detail} ·{" "}
              {r.createdAt.toLocaleString("pt-PT")}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
