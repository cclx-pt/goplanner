import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { modules, permissions, organizationModules } from "@/core/db/schema";
import { getModuleRegistry } from "./registry";

/**
 * Sincroniza os módulos e permissões DECLARADOS em código (manifestos) para a
 * base de dados. Idempotente: faz upsert por chave. Corre no bootstrap e pode
 * ser reutilizado sempre que os manifestos mudarem.
 */
export async function syncModules(): Promise<void> {
  const registry = getModuleRegistry();

  for (const m of registry.values()) {
    const [mod] = await db
      .insert(modules)
      .values({ key: m.key, name: m.name })
      .onConflictDoUpdate({ target: modules.key, set: { name: m.name } })
      .returning({ id: modules.id });

    for (const p of m.permissions ?? []) {
      await db
        .insert(permissions)
        .values({ moduleId: mod.id, key: p.key, label: p.label })
        .onConflictDoUpdate({
          target: permissions.key,
          set: { label: p.label, moduleId: mod.id },
        });
    }
  }
}

/** Ativa todos os módulos registados para uma organização (idempotente). */
export async function enableAllModulesForOrg(organizationId: string): Promise<void> {
  const registry = getModuleRegistry();

  for (const m of registry.values()) {
    const [mod] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.key, m.key))
      .limit(1);
    if (!mod) continue;

    const [existing] = await db
      .select({ id: organizationModules.id })
      .from(organizationModules)
      .where(
        and(
          eq(organizationModules.organizationId, organizationId),
          eq(organizationModules.moduleId, mod.id),
        ),
      )
      .limit(1);

    if (!existing) {
      await db
        .insert(organizationModules)
        .values({ organizationId, moduleId: mod.id, active: true });
    }
  }
}
