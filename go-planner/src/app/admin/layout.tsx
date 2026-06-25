import Link from "next/link";
import { requireOrgAdmin } from "./guard";

const NAV = [
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
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-brand-navy">Administração</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-600">{ctx.organizationName}</span>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Voltar ao dashboard
        </Link>
      </header>

      <div className="mx-auto flex max-w-5xl gap-6 p-6">
        <nav className="w-44 shrink-0">
          <ul className="flex flex-col gap-1">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-brand-navy transition hover:bg-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
