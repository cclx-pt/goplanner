import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getAccessState,
  canHere,
  type AccessContext,
} from "@/core/access/context";
import { getModuleRegistry } from "@/core/modules/registry";
import { SignOutButton } from "./SignOutButton";

/** Itens de navegação contribuídos pelos módulos, filtrados por can(). */
async function visibleNav(ctx: AccessContext) {
  const registry = getModuleRegistry();
  const items = [...registry.values()].flatMap((m) =>
    (m.navigation ?? []).map((n) => ({ ...n, moduleKey: m.key })),
  );

  const out: typeof items = [];
  for (const item of items) {
    if (!item.requires || (await canHere(ctx, item.requires, item.moduleKey))) {
      out.push(item);
    }
  }
  return out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const ADMIN_LINKS = [
  { href: "/admin/communities", label: "Comunidades" },
  { href: "/admin/members", label: "Membros" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/modules", label: "Módulos" },
];

export default async function DashboardPage() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  const { ctx } = state;
  const nav = await visibleNav(ctx);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-brand-navy">Go Planner</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-600">{ctx.organizationName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{ctx.name ?? ctx.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold text-brand-navy">
          Olá{ctx.name ? `, ${ctx.name}` : ""}.
        </h1>
        {ctx.isOrgAdmin && (
          <p className="mt-1 text-sm text-brand-blue">
            És administrador da organização.
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Módulos
          </h2>
          {nav.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Sem módulos visíveis para o teu nível de acesso.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nav.map((item) => (
                <li
                  key={`${item.moduleKey}:${item.route}`}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="font-medium text-brand-navy">{item.label}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {item.route} · ecrãs em breve (Fase 5)
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {ctx.isOrgAdmin && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Administração
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {ADMIN_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-block rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
