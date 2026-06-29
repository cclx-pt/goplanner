import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Scoping de TENANT centralizado.
 *
 * Decisão de arquitetura (isolamento híbrido): TODA a entidade carrega
 * `organization_id` e TODA a query de dados de um tenant passa o filtro por
 * AQUI — um único sítio. Assim o isolamento nunca depende de um developer se
 * lembrar do `WHERE`, e há um ponto único para, mais tarde, ligar Row-Level
 * Security do Postgres (SET LOCAL app.tenant_id + policies).
 *
 * Uso:
 *   db.select().from(table).where(tenantFilter(table, orgId))
 *   db.select().from(table).where(scopedTo(table, orgId, eq(table.x, y)))
 */

/** Tabela que pode ser scoped a um tenant: tem a coluna `organizationId`. */
export interface TenantScoped {
  organizationId: PgColumn;
}

/** Predicado base de tenant: `organization_id = :orgId`. */
export function tenantFilter(table: TenantScoped, organizationId: string): SQL {
  return eq(table.organizationId, organizationId);
}

/** Combina o filtro de tenant com filtros adicionais (ignora os `undefined`). */
export function scopedTo(
  table: TenantScoped,
  organizationId: string,
  ...extra: Array<SQL | undefined>
): SQL {
  // `and` com pelo menos um argumento devolve sempre um SQL.
  return and(eq(table.organizationId, organizationId), ...extra) as SQL;
}
