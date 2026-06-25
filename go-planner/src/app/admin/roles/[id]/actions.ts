"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { roles, permissions, rolePermissions } from "@/core/db/schema";
import { requireOrgAdmin } from "../../guard";

/**
 * Substitui o conjunto de permissões de um role pelo selecionado no formulário.
 * Revalida que o role pertence à organização e que cada permissão existe.
 */
export async function setRolePermissionsAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const roleId = String(formData.get("roleId") ?? "");
  if (!roleId) return;

  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, ctx.organizationId)))
    .limit(1);
  if (!role) return;

  const selected = formData.getAll("permissionIds").map(String);

  await db.transaction(async (tx) => {
    const valid = await tx.select({ id: permissions.id }).from(permissions);
    const validSet = new Set(valid.map((v) => v.id));
    const toInsert = selected.filter((pid) => validSet.has(pid));

    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (toInsert.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(toInsert.map((permissionId) => ({ roleId, permissionId })));
    }
  });

  revalidatePath(`/admin/roles/${roleId}`);
}
