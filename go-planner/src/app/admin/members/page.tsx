import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { users, memberships, roles, communities } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { createMemberAction } from "./actions";

export default async function MembersPage() {
  const ctx = await requireOrgAdmin();

  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.organizationId, ctx.organizationId))
    .orderBy(asc(users.email));

  const memRows = await db
    .select({
      userId: memberships.userId,
      roleName: roles.name,
      isOrgAdmin: roles.isOrgAdmin,
      communityName: communities.name,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .leftJoin(communities, eq(memberships.communityId, communities.id))
    .where(eq(users.organizationId, ctx.organizationId));

  const byUser = new Map<
    string,
    { roleName: string; isOrgAdmin: boolean; communityName: string | null }[]
  >();
  for (const m of memRows) {
    const arr = byUser.get(m.userId) ?? [];
    arr.push({
      roleName: m.roleName,
      isOrgAdmin: m.isOrgAdmin,
      communityName: m.communityName,
    });
    byUser.set(m.userId, arr);
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
        {userRows.map((u) => {
          const mems = byUser.get(u.id) ?? [];
          return (
            <li key={u.id} className="p-4">
              <div className="text-sm font-medium text-brand-navy">
                {u.name ?? u.email}
              </div>
              <div className="text-xs text-gray-400">{u.email}</div>
              <ul className="mt-2 flex flex-wrap gap-2">
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
