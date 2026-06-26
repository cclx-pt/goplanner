"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarItem {
  href: string;
  label: string;
}

/**
 * Navegação lateral (sidebar) com destaque da opção ATIVA.
 *
 * A opção ativa é a que tem o prefixo mais específico do caminho atual
 * (ex.: em /admin/roles/123 fica ativa "Roles" e não a raiz). Cliente, porque
 * precisa do `usePathname`.
 */
export function SidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();

  const activeHref = items
    .filter((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <ul className="flex flex-col gap-1">
      {items.map((l) => {
        const active = l.href === activeHref;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "block rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-blue shadow-sm ring-1 ring-gray-200"
                  : "block rounded-md px-3 py-2 text-sm font-medium text-brand-navy transition hover:bg-white"
              }
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
