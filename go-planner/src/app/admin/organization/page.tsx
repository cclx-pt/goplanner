import { count, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, communities, users } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

/**
 * Vista da ORGANIZAÇÃO (tenant raiz) — APENAS LEITURA.
 *
 * O admin da organização gere o que está DENTRO da organização (comunidades,
 * membros, roles, módulos), mas não pode editar nem eliminar a própria
 * organização: isso é da torre de controlo da plataforma (que gere os tenants).
 */
export default async function OrganizationPage() {
  const ctx = await requireOrgAdmin();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1);

  const [[commCount], [userCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(communities)
      .where(eq(communities.organizationId, ctx.organizationId)),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.organizationId, ctx.organizationId)),
  ]);

  const rows: { label: string; value: string }[] = [
    { label: "Nome", value: org?.name ?? "—" },
    { label: "Identificador (tenant)", value: org?.id ?? "—" },
    {
      label: "Criada",
      value: org ? org.createdAt.toLocaleDateString("pt-PT") : "—",
    },
    { label: "Comunidades", value: String(commCount?.value ?? 0) },
    { label: "Utilizadores", value: String(userCount?.value ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Organização</h1>
      <p className="mt-1 text-sm text-gray-500">
        A organização é o tenant raiz. Aqui consultas os seus dados —{" "}
        <span className="font-medium text-brand-navy">apenas leitura</span>.
        Criar, editar ou eliminar organizações é feito ao nível da plataforma.
      </p>

      <dl className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-4 p-4"
          >
            <dt className="text-sm text-gray-500">{r.label}</dt>
            <dd
              className={
                r.label.startsWith("Identificador")
                  ? "truncate font-mono text-xs text-gray-600"
                  : "text-sm font-medium text-brand-navy"
              }
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-gray-400">
        Apenas leitura — como administrador da organização não podes editar nem
        eliminar a organização.
      </p>
    </div>
  );
}
