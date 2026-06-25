import type { ComponentType } from "react";

/**
 * Contrato técnico de módulo da plataforma.
 *
 * Princípio: o módulo DECLARA, a plataforma ORQUESTRA. Um módulo nunca decide
 * acessos nem toca diretamente em navegação ou scoping — entrega tudo
 * declarativamente neste manifesto.
 */

export type Scope = "organization" | "community";

/**
 * Base que TODA a entidade de um módulo tem de estender.
 * Permite à camada de acessos fazer scoping automático das queries.
 * communityId nulo = âmbito de organização.
 */
export interface ScopedEntity {
  id: string;
  organizationId: string;
  communityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Permissão declarada. Chave no formato modulo.recurso.acao. */
export interface PermissionDef {
  key: string;
  label: string;
  description?: string;
}

/** Item de menu contribuído por um módulo. */
export interface NavigationItem {
  label: string;
  route: string;
  icon?: string;
  /** Permissão necessária para o item aparecer. */
  requires?: string;
  order?: number;
}

/** Widget de dashboard contribuído por um módulo. */
export interface DashboardWidget {
  key: string;
  title: string;
  component: ComponentType;
  requires?: string;
  defaultSize?: "sm" | "md" | "lg";
}

/** Eventos de domínio que o módulo emite e/ou consome. */
export interface ModuleEvents {
  emits?: string[];
  consumes?: string[];
}

export type SettingField =
  | { type: "boolean"; default: boolean; label?: string }
  | { type: "number"; default: number; label?: string; min?: number; max?: number }
  | { type: "string"; default: string; label?: string }
  | { type: "select"; default: string; options: string[]; label?: string };

/** Bloco de configuração do módulo. */
export interface ModuleSettings {
  scope: Scope;
  schema: Record<string, SettingField>;
}

/** Contexto entregue aos hooks de lifecycle. */
export interface ModuleContext {
  organizationId: string;
}

/** Hooks de ciclo de vida. Desativar ARQUIVA, nunca apaga. */
export interface ModuleLifecycle {
  onEnable?: (ctx: ModuleContext) => Promise<void>;
  onDisable?: (ctx: ModuleContext) => Promise<void>;
}

/** Contrato completo que um módulo expõe à plataforma. */
export interface ModuleManifest {
  key: string;
  name: string;
  version: string;
  description?: string;
  /** Chaves de módulos que têm de estar ativos para este poder ativar. */
  dependsOn?: string[];

  permissions?: PermissionDef[];
  navigation?: NavigationItem[];
  dashboardWidgets?: DashboardWidget[];
  events?: ModuleEvents;
  settings?: ModuleSettings;
  lifecycle?: ModuleLifecycle;
}

/** Helper para definir um módulo com verificação de tipos e autocomplete. */
export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}
