import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { user as authUser } from "@/core/auth/schema";

/**
 * Schema do núcleo da plataforma (Fase 0).
 * Tradução direta do ERD: organização, comunidades, utilizadores, roles,
 * memberships, módulos e permissões.
 */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("communities_org_idx").on(t.organizationId),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull().unique(),
    name: text("name"),
    // Ligação à identidade do Better Auth (auth.user.id). NULL = sem login ainda.
    authUserId: text("auth_user_id")
      .unique()
      .references(() => authUser.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("users_org_idx").on(t.organizationId),
  }),
);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  // Atalho org-wide: admin de organização ignora o check de âmbito.
  isOrgAdmin: boolean("is_org_admin").notNull().default(false),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    // NULL = âmbito de organização (admin de org). Preenchido = comunidade.
    communityId: uuid("community_id").references(() => communities.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (t) => ({
    userIdx: index("memberships_user_idx").on(t.userId),
    communityIdx: index("memberships_community_idx").on(t.communityId),
  }),
);

export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Chave estável do módulo, ex.: 'escalas', 'eventos', 'pessoas'.
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
});

export const organizationModules = pgTable(
  "organization_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    orgIdx: index("org_modules_org_idx").on(t.organizationId),
  }),
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    // Formato: modulo.recurso.acao  (ex.: 'escalas.escala.editar')
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
  },
  (t) => ({
    moduleIdx: index("permissions_module_idx").on(t.moduleId),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
  }),
);
