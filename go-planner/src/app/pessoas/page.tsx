import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { people, households } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

const STAGES: Record<string, string> = {
  visitor: "Visitante",
  first_timer: "1.ª vez",
  regular: "Frequente",
  member: "Membro",
  leader: "Líder",
};

export default async function PessoasPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "pessoas.pessoa.ver", "pessoas"))) redirect("/dashboard");

  const rows = await db
    .select({
      id: people.id,
      name: people.name,
      email: people.email,
      stage: people.lifecycleStage,
      household: households.name,
    })
    .from(people)
    .leftJoin(households, eq(people.householdId, households.id))
    .where(tenantFilter(people, ctx.organizationId))
    .orderBy(asc(people.email));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[
          { label: ctx.organizationName, href: "/dashboard" },
          { label: "Pessoas" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Pessoas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Espinha das pessoas — {rows.length} no total.
        </p>
        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-brand-navy">
                  {p.name ?? p.email ?? "—"}
                </div>
                <div className="text-xs text-gray-400">
                  {p.email ?? "sem email"}
                  {p.household ? ` · ${p.household}` : ""}
                </div>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-brand-navy">
                {STAGES[p.stage] ?? p.stage}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
