import Link from "next/link";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations, communities, people } from "@/core/db/schema";
import { manageOrgAction } from "@/app/admin/actions";
import { requirePlatformAdmin } from "../../guard";
import {
  renameOrganizationAction,
  deleteOrganizationAction,
  setOrgRegionAction,
} from "../actions";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  if (!org) notFound();

  const [[commCount], [userCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(communities)
      .where(eq(communities.organizationId, id)),
    db
      .select({ value: count() })
      .from(people)
      .where(eq(people.organizationId, id)),
  ]);

  return (
    <div className="max-w-xl">
      <Link
        href="/platform/organizations"
        className="text-sm text-brand-blue hover:underline"
      >
        ← Organizações
      </Link>
      <h1 className="mt-2 text-xl font-bold text-brand-navy">{org.name}</h1>
      <p className="mt-1 font-mono text-xs text-gray-400">{org.id}</p>

      {/* Editar (renomear) */}
      <form
        action={renameOrganizationAction}
        className="mt-5 rounded-lg border border-gray-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-brand-navy">Editar</h2>
        <input type="hidden" name="orgId" value={org.id} />
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-gray-500">Nome</span>
          <input
            name="name"
            defaultValue={org.name}
            required
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
          />
        </label>
        <button
          type="submit"
          className="mt-3 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Guardar
        </button>
      </form>

      {/* Gerir conteúdo (abaixo da org) */}
      <form action={manageOrgAction} className="mt-4">
        <input type="hidden" name="orgId" value={org.id} />
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
        >
          Gerir conteúdo (comunidades, membros, roles, módulos) →
        </button>
      </form>

      {/* Região e localização (i18n / moeda / país / fuso) */}
      <form
        action={setOrgRegionAction}
        className="mt-4 rounded-lg border border-gray-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-brand-navy">
          Região e localização
        </h2>
        <input type="hidden" name="orgId" value={org.id} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-500">Locale (BCP-47)</span>
            <input
              name="locale"
              defaultValue={org.locale}
              required
              placeholder="pt-PT"
              className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-500">Moeda (ISO 4217)</span>
            <input
              name="currency"
              defaultValue={org.currency}
              required
              placeholder="EUR"
              className="rounded-md border border-gray-300 px-3 py-2 uppercase outline-none focus:border-brand-blue"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-500">País (ISO 3166)</span>
            <input
              name="country"
              defaultValue={org.country}
              required
              placeholder="PT"
              className="rounded-md border border-gray-300 px-3 py-2 uppercase outline-none focus:border-brand-blue"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-500">Fuso horário (IANA)</span>
            <input
              name="timezone"
              defaultValue={org.timezone}
              required
              placeholder="Europe/Lisbon"
              className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Guardar região
        </button>
      </form>

      {/* Zona perigosa: eliminar org + tudo abaixo */}
      <form
        action={deleteOrganizationAction}
        className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <h2 className="text-sm font-semibold text-red-700">
          Eliminar organização
        </h2>
        <p className="mt-1 text-xs text-red-600">
          Elimina a organização e <strong>tudo abaixo</strong>:{" "}
          {commCount?.value ?? 0} comunidade(s), {userCount?.value ?? 0}{" "}
          pessoa(s), roles, memberships e módulos ativos. As contas de login
          (globais) NÃO são apagadas. Esta ação é <strong>irreversível</strong>.
        </p>
        <input type="hidden" name="orgId" value={org.id} />
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-red-700">
            Escreve <strong>{org.name}</strong> para confirmar
          </span>
          <input
            name="confirmName"
            required
            autoComplete="off"
            placeholder={org.name}
            className="rounded-md border border-red-300 px-3 py-2 outline-none focus:border-red-500"
          />
        </label>
        <button
          type="submit"
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Eliminar definitivamente
        </button>
      </form>
    </div>
  );
}
