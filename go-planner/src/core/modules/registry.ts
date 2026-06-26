import type { ModuleManifest } from "./contract";

/**
 * Registo de módulos da plataforma.
 *
 * À medida que crias módulos novos, importa o manifesto e adiciona-o à lista.
 * (Numa fase posterior, isto pode passar a auto-descoberta por convenção de
 * pastas — por agora, a lista explícita é simples e clara.)
 */
const MODULES: ModuleManifest[] = [];

/** Devolve todos os módulos registados, indexados por chave. */
export function getModuleRegistry(): Map<string, ModuleManifest> {
  const map = new Map<string, ModuleManifest>();
  for (const m of MODULES) {
    if (map.has(m.key)) {
      throw new Error(`Módulo duplicado: "${m.key}"`);
    }
    map.set(m.key, m);
  }
  return map;
}

/**
 * Valida o grafo de dependências: nenhum módulo pode depender de outro que
 * não esteja registado. Devolve a lista de problemas (vazia = tudo ok).
 */
export function validateDependencies(): string[] {
  const registry = getModuleRegistry();
  const problems: string[] = [];

  for (const m of registry.values()) {
    for (const dep of m.dependsOn ?? []) {
      if (!registry.has(dep)) {
        problems.push(`"${m.key}" depende de "${dep}", que não está registado.`);
      }
    }
  }

  return problems;
}

/** Todas as permissões declaradas por todos os módulos (para sincronizar a BD). */
export function allDeclaredPermissions() {
  const registry = getModuleRegistry();
  return [...registry.values()].flatMap((m) =>
    (m.permissions ?? []).map((p) => ({ moduleKey: m.key, ...p })),
  );
}
