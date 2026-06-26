"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/core/auth/client";
import { LogoMark } from "@/components/Logo";

export interface NavChild {
  label: string;
  href: string;
}
export interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
}
export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Barra de navegação superior do shell da app (estilo "control tower"):
 * logo + menus (com dropdowns) + pesquisa + notificações + ajuda + avatar,
 * e uma migalha (breadcrumb) por baixo. Cliente (dropdowns + sessão).
 */
export function TopNav({
  appName = "Go Planner",
  nav,
  user,
  breadcrumb = [],
  searchPlaceholder = "Pesquisar no Go Planner",
}: {
  appName?: string;
  nav: NavItem[];
  user: { name: string | null; email: string };
  breadcrumb?: Crumb[];
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials =
    (user.name ?? user.email)
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <header ref={ref} className="sticky top-0 z-40 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 md:gap-4">
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen(open === "__mobile" ? null : "__mobile")}
          className="rounded-md p-2 text-brand-navy transition hover:bg-gray-50 md:hidden"
        >
          <MenuIcon />
        </button>
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <LogoMark size={28} />
          <span className="text-lg font-bold text-brand-navy">{appName}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(open === item.label ? null : item.label)
                  }
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {item.label}
                  <Chevron open={open === item.label} />
                </button>
                {open === item.label && (
                  <div className="absolute left-0 top-full mt-1 min-w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setOpen(null)}
                        className="block px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden sm:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder={searchPlaceholder}
              className="w-52 rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-brand-blue lg:w-72"
            />
          </div>

          <button
            type="button"
            aria-label="Notificações"
            className="relative rounded-md p-2 text-gray-500 transition hover:bg-gray-50"
          >
            <BellIcon />
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              0
            </span>
          </button>

          <button
            type="button"
            aria-label="Ajuda"
            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-50"
          >
            <HelpIcon />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === "__user" ? null : "__user")}
              aria-label="Conta"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white"
            >
              {initials}
            </button>
            {open === "__user" && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-2">
                  <div className="text-sm font-medium text-brand-navy">
                    {user.name ?? user.email}
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    await signOut();
                    router.push("/sign-in");
                    router.refresh();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? "A sair…" : "Sair"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {open === "__mobile" && (
        <div className="border-b border-gray-200 bg-white px-2 py-2 shadow-sm md:hidden">
          <ul className="flex flex-col">
            {nav.map((item) =>
              item.children ? (
                <li key={item.label} className="py-1">
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {item.label}
                  </div>
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setOpen(null)}
                      className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {c.label}
                    </Link>
                  ))}
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.href ?? "#"}
                    onClick={() => setOpen(null)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {breadcrumb.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            {breadcrumb.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">›</span>}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="hover:text-brand-blue hover:underline"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? "font-medium text-brand-navy"
                        : ""
                    }
                  >
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
