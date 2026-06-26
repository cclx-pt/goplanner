import Link from "next/link";
import { requireOrgAdmin } from "./guard";
import { setActiveOrgAction } from "./actions";
import { SidebarNav } from "@/components/SidebarNav";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { href: "/admin/organization", label: "Organização" },
  { href: "/admin/communities", label: "Comunidades" },
  { href: "/admin/members", label: "Membros" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/modules", label: "Módulos" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOrgAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <LogoMark size={32} />
          <span className="font-bold text-brand-navy">Administração</span>
          <span className="text-sm text-gray-400">·</span>
          {ctx.actingAsPlatform ? (
            <form
              action={setActiveOrgAction}
              className="flex items-center gap-1.5"
            >
              <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-xs font-medium text-brand-purple">
                master
              </span>
              <select
                name="orgId"
                defaultValue={ctx.organizationId}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-brand-navy outline-none focus:border-brand-blue"
              >
                {ctx.switchableOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-brand-navy transition hover:bg-gray-50"
              >
                Trocar
              </button>
            </form>
          ) : (
            <span className="text-sm text-gray-600">{ctx.organizationName}</span>
          )}
        </div>
        <Link
          href={ctx.actingAsPlatform ? "/platform" : "/dashboard"}
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Voltar
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 p-6">
        <nav className="w-44 shrink-0">
          <SidebarNav items={NAV} />
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
