import { redirect } from "next/navigation";
import {
  getAccessState,
  canHere,
  type AccessContext,
} from "@/core/access/context";
import { getTranslations } from "next-intl/server";
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
  { href: "/admin/organization", navKey: "organization" },
  { href: "/admin/communities", navKey: "communities" },
  { href: "/admin/members", navKey: "members" },
  { href: "/admin/roles", navKey: "roles" },
  { href: "/admin/modules", navKey: "modules" },
  { href: "/admin/workflows", navKey: "workflows" },
] as const;

export default async function DashboardPage() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  const { ctx } = state;
  const platformAdmin = await getPlatformAdmin();
  const isAdmin = ctx.isOrgAdmin || platformAdmin !== null;

  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");

  // A torre de controlo é reservada a administradores (não a membros da igreja).
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <LogoMark size={40} className="mb-4" />
        <h1 className="text-xl font-bold text-brand-navy">
          {t("restrictedTitle")}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          {t("restrictedBody")}
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    );
  }

  const moduleNav = await visibleNav(ctx);

  const topNav: NavItem[] = [
    { label: t("homeTab"), href: "/dashboard" },
    ...moduleNav.map((n) => ({ label: n.label, href: n.route })),
    ...(ctx.isOrgAdmin
      ? [
          {
            label: tn("admin"),
            children: ADMIN_LINKS.map((l) => ({
              label: tn(l.navKey),
              href: l.href,
            })),
          },
        ]
      : []),
    ...(platformAdmin
      ? [
          {
            label: tn("platform"),
            children: [
              { label: tn("overview"), href: "/platform" },
              { label: tn("organizations"), href: "/platform/organizations" },
              { label: tn("admins"), href: "/platform/admins" },
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
          { label: t("homeTab") },
        ]}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-2xl font-bold text-brand-navy">
          {ctx.name ? t("greeting", { name: ctx.name }) : t("greetingNoName")}
        </h1>
        {ctx.isOrgAdmin && (
          <p className="mt-1 text-sm text-brand-blue">
            {t("orgAdminNote", { org: ctx.organizationName })}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("modulesTitle")}
          </h2>
          {moduleNav.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("noModules")}</p>
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
