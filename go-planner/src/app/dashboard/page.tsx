import { redirect } from "next/navigation";
import {
  getAccessState,
  canHere,
  type AccessContext,
} from "@/core/access/context";
import { getModuleRegistry } from "@/core/modules/registry";
import { getPlatformAdmin } from "@/core/platform/access";
import { SignOutButton } from "@/components/SignOutButton";
import { TopNav, type NavItem } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";

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
  { href: "/admin/organization", label: "Organização" },
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
  const platformAdmin = await getPlatformAdmin();
  const isAdmin = ctx.isOrgAdmin || platformAdmin !== null;

  // A torre de controlo é reservada a administradores (não a membros da igreja).
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <LogoMark size={40} className="mb-4" />
        <h1 className="text-xl font-bold text-brand-navy">Acesso restrito</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          Esta área é reservada a administradores. A tua conta não tem acesso a
          esta área.
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    );
  }

  const moduleNav = await visibleNav(ctx);

  const topNav: NavItem[] = [
    { label: "Minha página", href: "/dashboard" },
    ...moduleNav.map((n) => ({ label: n.label, href: n.route })),
    ...(ctx.isOrgAdmin
      ? [
          {
            label: "Administração",
            children: ADMIN_LINKS.map((l) => ({ label: l.label, href: l.href })),
          },
        ]
      : []),
    ...(platformAdmin
      ? [
          {
            label: "Plataforma",
            children: [
              { label: "Visão geral", href: "/platform" },
              { label: "Organizações", href: "/platform/organizations" },
              { label: "Administradores", href: "/platform/admins" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={topNav}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[
          { label: ctx.organizationName, href: "/dashboard" },
          { label: "Minha página" },
        ]}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-2xl font-bold text-brand-navy">
          Olá{ctx.name ? `, ${ctx.name}` : ""}.
        </h1>
        {ctx.isOrgAdmin && (
          <p className="mt-1 text-sm text-brand-blue">
            És administrador da organização — {ctx.organizationName}.
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Módulos
          </h2>
          {moduleNav.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Sem módulos visíveis para o teu nível de acesso.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {moduleNav.map((item) => (
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
      </main>

      <Footer />
    </div>
  );
}
