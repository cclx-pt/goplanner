import { requirePlatformAdmin } from "./guard";
import { SidebarNav } from "@/components/SidebarNav";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/platform", label: "Visão geral" },
  { href: "/platform/organizations", label: "Organizações" },
  { href: "/platform/admins", label: "Administradores" },
];

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <LogoMark size={32} />
          <span className="font-bold text-brand-navy">Go Planner</span>
          <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-xs font-medium text-brand-purple">
            plataforma
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{admin.name ?? admin.email}</span>
          <SignOutButton />
        </div>
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
