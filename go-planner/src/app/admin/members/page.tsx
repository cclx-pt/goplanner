import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { people, memberships, roles, communities, consents } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { createMemberAction, eraseMemberAction } from "./actions";

export default async function MembersPage() {
  const ctx = await requireOrgAdmin();

  const peopleRows = await db
    .select({ id: people.id, name: people.name, email: people.email })
    .from(people)
    .where(eq(people.organizationId, ctx.organizationId))
    .orderBy(asc(people.email));

  const consentRows = await db
    .select({
      personId: consents.personId,
      purpose: consents.purpose,
      granted: consents.granted,
    })
    .from(consents)
    .where(eq(consents.organizationId, ctx.organizationId));
  const consentByPerson = new Map<string, boolean>();
  for (const c of consentRows) {
    if (c.purpose === "data_processing") consentByPerson.set(c.personId, c.granted);
  }

  const memRows = await db
    .select({
      personId: memberships.personId,
      roleName: roles.name,
      isOrgAdmin: roles.isOrgAdmin,
      communityName: communities.name,
    })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .leftJoin(communities, eq(memberships.communityId, communities.id))
    .where(eq(memberships.organizationId, ctx.organizationId));

  const byPerson = new Map<
    string,
    { roleName: string; isOrgAdmin: boolean; communityName: string | null }[]
  >();
  for (const m of memRows) {
    // Operadores puros (membership sem person) não aparecem na lista de membros.
    if (!m.personId) continue;
    const arr = byPerson.get(m.personId) ?? [];
    arr.push({
      roleName: m.roleName,
      isOrgAdmin: m.isOrgAdmin,
      communityName: m.communityName,
    });
    byPerson.set(m.personId, arr);
  }

  const roleRows = await db
    .select({ id: roles.id, name: roles.name, isOrgAdmin: roles.isOrgAdmin })
    .from(roles)
    .where(eq(roles.organizationId, ctx.organizationId))
    .orderBy(asc(roles.name));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Membros</h1>
      <p className="mt-1 text-sm text-gray-500">
        Utilizadores da organização e as suas memberships (role × comunidade).
      </p>

      <form
        action={createMemberAction}
        className="mt-5 grid gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <input
          name="name"
          required
          placeholder="Nome"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="email@exemplo.pt"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Palavra-passe (mín. 8)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <select
          name="roleId"
          required
          defaultValue=""
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-blue"
        >
          <option value="" disabled>
            Role…
          </option>
          {roleRows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.isOrgAdmin ? " (admin)" : ""}
            </option>
          ))}
        </select>
        <select
          name="lifecycleStage"
          defaultValue="visitor"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-blue"
        >
          <option value="visitor">Visitante</option>
          <option value="first_timer">1.ª vez</option>
          <option value="regular">Frequente</option>
          <option value="member">Membro</option>
          <option value="leader">Líder</option>
        </select>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" name="consent" defaultChecked />
            Consentimento para tratamento de dados (RGPD)
          </label>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Adicionar utilizador
          </button>
        </div>
      </form>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {peopleRows.map((p) => {
          const mems = byPerson.get(p.id) ?? [];
          return (
            <li key={p.id} className="p-4">
              <div className="text-sm font-medium text-brand-navy">
                {p.name ?? p.email ?? "—"}
              </div>
              <div className="text-xs text-gray-400">{p.email ?? "sem email"}</div>
              <ul className="mt-2 flex flex-wrap gap-2">
                <li
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    consentByPerson.get(p.id)
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {consentByPerson.get(p.id) ? "RGPD ✓" : "sem consentimento"}
                </li>
                {mems.length === 0 ? (
                  <li className="text-xs text-gray-400">Sem memberships.</li>
                ) : (
                  mems.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-brand-navy"
                    >
                      {m.roleName}
                      {" · "}
                      {m.isOrgAdmin
                        ? "organização"
                        : (m.communityName ?? "sem comunidade")}
                    </li>
                  ))
                )}
              </ul>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600">
                  Apagar (direito ao esquecimento)
                </summary>
                <form action={eraseMemberAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="personId" value={p.id} />
                  <input
                    name="confirm"
                    placeholder={`Escreve "${p.name ?? p.email ?? ""}" para confirmar`}
                    autoComplete="off"
                    className="flex-1 rounded-md border border-red-300 px-2 py-1 text-xs outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                  >
                    Apagar
                  </button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-gray-400">
        A membership é criada ao nível da organização. Partilha a palavra-passe
        com o utilizador (pode alterá-la depois).
      </p>
    </div>
  );
}
