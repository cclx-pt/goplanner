import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/core/db";
import {
  organizations,
  communities,
  users,
  platformAdmins,
} from "@/core/db/schema";
import { requirePlatformAdmin } from "./guard";

export default async function PlatformOverviewPage() {
  await requirePlatformAdmin();

  const [[orgs], [comms], [usrs], [admins]] = await Promise.all([
    db.select({ value: count() }).from(organizations),
    db.select({ value: count() }).from(communities),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(platformAdmins),
  ]);

  const cards: {
    label: string;
    value: number;
    href?: string;
    color: string;
  }[] = [
    {
      label: "Organizações",
      value: orgs?.value ?? 0,
      href: "/platform/organizations",
      color: "text-brand-green",
    },
    { label: "Comunidades", value: comms?.value ?? 0, color: "text-brand-blue" },
    { label: "Utilizadores", value: usrs?.value ?? 0, color: "text-brand-navy" },
    {
      label: "Admins de plataforma",
      value: admins?.value ?? 0,
      href: "/platform/admins",
      color: "text-brand-purple",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Visão geral</h1>
      <p className="mt-1 text-sm text-gray-500">
        Estado da plataforma — todos os tenants (organizações) num só sítio.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{c.label}</div>
            {c.href && (
              <Link
                href={c.href}
                className="mt-2 inline-block text-xs font-medium text-brand-blue hover:underline"
              >
                Ver →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
