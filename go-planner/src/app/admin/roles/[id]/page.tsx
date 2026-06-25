import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/core/db";
import { roles, permissions, rolePermissions, modules } from "@/core/db/schema";
import { requireOrgAdmin } from "../../guard";
import { setRolePermissionsAction } from "./actions";

export default async function RolePermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgAdmin();

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, id), eq(roles.organizationId, ctx.organizationId)))
    .limit(1);
  if (!role) notFound();

  const perms = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      label: permissions.label,
      moduleName: modules.name,
    })
    .from(permissions)
    .innerJoin(modules, eq(permissions.moduleId, modules.id))
    .orderBy(asc(modules.name), asc(permissions.key));

  const assigned = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, role.id));
  const assignedSet = new Set(assigned.map((a) => a.permissionId));

  const groups = new Map<string, typeof perms>();
  for (const p of perms) {
    const arr = groups.get(p.moduleName) ?? [];
    arr.push(p);
    groups.set(p.moduleName, arr);
  }

  return (
    <div>
      <Link
        href="/admin/roles"
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        ← Roles
      </Link>
      <h1 className="mt-2 text-xl font-bold text-brand-navy">
        Permissões · {role.name}
      </h1>

      {perms.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Ainda não há permissões registadas. Ativa módulos primeiro.
        </p>
      ) : (
        <form action={setRolePermissionsAction} className="mt-5">
          <input type="hidden" name="roleId" value={role.id} />

          <div className="flex flex-col gap-5">
            {[...groups.entries()].map(([moduleName, items]) => (
              <fieldset
                key={moduleName}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <legend className="px-1 text-sm font-semibold text-brand-navy">
                  {moduleName}
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {items.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="permissionIds"
                        value={p.id}
                        defaultChecked={assignedSet.has(p.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-brand-navy">{p.label}</span>
                      <span className="text-xs text-gray-400">{p.key}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <button
            type="submit"
            className="mt-5 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Guardar permissões
          </button>
        </form>
      )}
    </div>
  );
}
