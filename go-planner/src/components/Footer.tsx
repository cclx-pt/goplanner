import Link from "next/link";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Go Planner",
    links: [
      { label: "O que é", href: "#" },
      { label: "Roadmap", href: "#" },
      { label: "Novidades", href: "#" },
    ],
  },
  {
    title: "Administração",
    links: [
      { label: "Organização", href: "/admin/organization" },
      { label: "Comunidades", href: "/admin/communities" },
      { label: "Membros", href: "/admin/members" },
      { label: "Roles", href: "/admin/roles" },
      { label: "Módulos", href: "/admin/modules" },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { label: "Visão geral", href: "/platform" },
      { label: "Organizações", href: "/platform/organizations" },
      { label: "Administradores", href: "/platform/admins" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Documentação", href: "#" },
      { label: "Arquitetura", href: "#" },
      { label: "Modelo de acessos", href: "#" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Suporte", href: "#" },
      { label: "Contacto", href: "#" },
      { label: "FAQ", href: "#" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-gray-200 bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-brand-navy">{col.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-gray-600 transition hover:text-brand-blue hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-4 text-xs text-gray-500 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <Link href="#" className="hover:text-brand-blue hover:underline">
              Aviso de privacidade
            </Link>
            <Link href="#" className="hover:text-brand-blue hover:underline">
              Política de privacidade
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-brand-navy">Go Planner</span>
            <span>© {year}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
