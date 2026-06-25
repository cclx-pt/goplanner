import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { users, memberships, roles, communities } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";

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

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Membros</h1>
      <p className="mt-1 text-sm text-gray-500">
        Utilizadores da organização e as suas memberships (role × comunidade).
      </p>

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
        Convidar/associar novos membros chega numa iteração seguinte.
      </p>
    </div>
  );
}
