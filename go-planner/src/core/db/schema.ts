import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { user as authUser } from "@/core/auth/schema";

/**
 * Schema do núcleo da plataforma.
 *
 * Modelo de identidade em TRÊS camadas (mantém-nas separadas):
 *   - Account   = identidade de login GLOBAL (Better Auth `user`, na plataforma).
 *   - Person    = registo de congregação dentro de UM tenant (tabela `people`).
 *   - Membership= a ponte: liga uma conta GLOBAL a um tenant, com role(s) e um
 *                 `person_id` opcional. Uma conta pode ter memberships em VÁRIOS
 *                 tenants (a autorização é sempre scoped ao tenant da membership).
 */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Região / localização — CONFIGURAÇÃO, não código. Conduz formatação de
  // datas/números, moeda, fuso horário, formato de recibos fiscais, métodos de
  // pagamento, regime de conformidade e residência de dados. Lançar um novo país
  // é uma mudança de definições, não um release.
  locale: text("locale").notNull().default("pt-PT"), // BCP-47 (ex.: pt-PT, en-US)
  currency: text("currency").notNull().default("EUR"), // ISO 4217 (ex.: EUR, USD)
  country: text("country").notNull().default("PT"), // ISO 3166-1 alpha-2
  timezone: text("timezone").notNull().default("Europe/Lisbon"), // IANA
  // Modelo financeiro: 'global' (conta da org + sub-contas por comunidade) ou
  // 'autonomous' (cada comunidade tem contas independentes). Conduz o scoping
  // das finanças e a consolidação.
  financeModel: text("finance_model").notNull().default("global"),
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

/**
 * HOUSEHOLDS — agregado familiar (entidade de 1.ª classe, não um campo). Liga
 * cônjuges, filhos e dependentes. As pessoas referenciam o seu household.
 */
export const households = pgTable(
  "households",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("households_org_idx").on(t.organizationId) }),
);

/**
 * PEOPLE — a "espinha" das pessoas, por tenant.
 *
 * Substitui a antiga tabela `users`. É um registo de DOMÍNIO (quem a pessoa é),
 * NUNCA de login: as credenciais/sessões vivem no Account (Better Auth `user`).
 * A maioria das pessoas nunca faz login (crianças, visitantes, contactos), por
 * isso uma Person é perfeitamente útil SEM Account. A ligação conta↔pessoa, quando
 * existe, faz-se em `memberships.personId`.
 */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name"),
    // Email de CONTACTO (opcional). Não é identidade de login. Pode ser null.
    email: text("email"),
    // NIF (contribuinte) para recibos fiscais. Opcional.
    nif: text("nif"),
    // Agregado familiar (opcional). Null = sem household.
    householdId: uuid("household_id").references(() => households.id),
    // Ciclo de vida: visitor -> first_timer -> regular -> member -> leader.
    lifecycleStage: text("lifecycle_stage").notNull().default("visitor"),
    // GDPR: marca se o registo contém dados de CATEGORIA ESPECIAL (Art. 9 — a
    // afiliação religiosa é sensível). Exige consentimento explícito.
    specialCategory: boolean("special_category").notNull().default(false),
    // GDPR: limite de retenção (apagar/anonimizar após esta data). Null = sem prazo.
    retentionUntil: timestamp("retention_until"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("people_org_idx").on(t.organizationId),
    // Email único POR tenant (a mesma pessoa pode existir noutra organização).
    // Nulls são distintos no Postgres -> várias pessoas sem email são permitidas.
    orgEmailUnique: uniqueIndex("people_org_email_unique").on(
      t.organizationId,
      t.email,
    ),
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

/**
 * MEMBERSHIP — a ponte do modelo de identidade.
 *
 * Liga uma conta GLOBAL (`accountId` -> Better Auth user) a UM tenant
 * (`organizationId`), com um role e um âmbito (comunidade opcional). Carrega um
 * `personId` opcional: preenchido = a conta é também uma pessoa da congregação
 * (caso do portal do membro); null = operador puro, sem registo de congregação.
 */
/**
 * CONSENTS — registo AUDITÁVEL de consentimento, por pessoa e por finalidade.
 *
 * GDPR exige base legal documentada por propósito de tratamento. Cada linha
 * regista uma finalidade (data_processing, communications, photos,
 * special_category…), se foi concedido, a base legal e a origem. É imutável por
 * design (nova decisão = nova linha) — mantém o histórico.
 */
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    purpose: text("purpose").notNull(),
    granted: boolean("granted").notNull(),
    lawfulBasis: text("lawful_basis"),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    source: text("source"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("consents_org_idx").on(t.organizationId),
    personIdx: index("consents_person_idx").on(t.personId),
  }),
);

/** Etiquetas (segmentação) por tenant. */
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    label: text("label").notNull(),
  },
  (t) => ({ orgIdx: index("tags_org_idx").on(t.organizationId) }),
);

/** Ligação pessoa <-> tag (many-to-many). */
export const personTags = pgTable(
  "person_tags",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.personId, t.tagId] }) }),
);

/** Marcos / ordenanças: baptismo, dedicação, casamento, classe de membro… */
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    type: text("type").notNull(),
    occurredAt: timestamp("occurred_at"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ personIdx: index("milestones_person_idx").on(t.personId) }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Account GLOBAL (Better Auth user.id). Uma conta pode ter memberships em
    // VÁRIOS tenants — a autorização é SEMPRE scoped ao tenant da membership.
    accountId: text("account_id")
      .notNull()
      .references(() => authUser.id),
    // Tenant (organização) desta membership.
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    // Registo de DOMÍNIO (Person) ligado. NULL = operador puro (conta sem
    // registo de congregação neste tenant).
    personId: uuid("person_id").references(() => people.id),
    // NULL = âmbito de organização (admin de org). Preenchido = comunidade.
    communityId: uuid("community_id").references(() => communities.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("memberships_account_idx").on(t.accountId),
    accountOrgIdx: index("memberships_account_org_idx").on(
      t.accountId,
      t.organizationId,
    ),
    orgIdx: index("memberships_org_idx").on(t.organizationId),
    personIdx: index("memberships_person_idx").on(t.personId),
    communityIdx: index("memberships_community_idx").on(t.communityId),
  }),
);

export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Chave estável do módulo, ex.: 'eventos', 'pessoas'.
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
    // Formato: modulo.recurso.acao  (ex.: 'eventos.evento.editar')
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

/**
 * Administradores de PLATAFORMA — a "torre de controlo".
 *
 * Camada SEPARADA e ACIMA das organizações: staff que gere todos os tenants.
 * Não pertence a nenhuma organização — por isso NÃO usa `users`/`memberships`
 * (que são scoped a um tenant). A identidade vem do Better Auth (`auth.user.id`);
 * o provisionamento inicial é por allowlist de emails (env `PLATFORM_ADMIN_EMAILS`).
 */
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id")
    .notNull()
    .unique()
    .references(() => authUser.id),
  email: text("email").notNull(),
  name: text("name"),
  // Nível na plataforma: 'owner' (o primeiro; pode gerir staff) | 'admin'.
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * WORKFLOWS — motor trigger -> condition -> action (a maior alavanca: torna o
 * sistema "vivo" sem código). Cada workflow reage a um TRIGGER (ex.: person.created),
 * filtra por CONDIÇÕES e executa AÇÕES. Condições/ações em JSON (declarativo).
 */
export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    trigger: text("trigger").notNull(), // ex.: person.created
    conditions: jsonb("conditions").notNull().default([]),
    actions: jsonb("actions").notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("workflows_org_idx").on(t.organizationId) }),
);

/** Execuções de workflow (auditoria). */
export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id),
    trigger: text("trigger").notNull(),
    status: text("status").notNull(), // matched | skipped | error
    detail: text("detail"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ wfIdx: index("workflow_runs_wf_idx").on(t.workflowId) }),
);

/** Tarefas geradas (ex.: seguimento de visitante). Alvo da ação create_task. */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("tasks_org_idx").on(t.organizationId) }),
);

/** Fundos de doação (dízimos, ofertas, campanhas). Moeda por fundo (ISO 4217). */
export const funds = pgTable(
  "funds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("EUR"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("funds_org_idx").on(t.organizationId) }),
);

/** Doações. Dinheiro = INTEIRO em unidades menores + moeda (nunca float). */
export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    fundId: uuid("fund_id")
      .notNull()
      .references(() => funds.id),
    communityId: uuid("community_id").references(() => communities.id),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    method: text("method"), // cash, mbway, transfer, card
    campaignId: uuid("campaign_id"),
    recurrence: text("recurrence").notNull().default("none"), // none | monthly
    status: text("status").notNull().default("paid"), // pending | paid | failed
    externalRef: text("external_ref"),
    donorPhone: text("donor_phone"),
    donorNif: text("donor_nif"),
    donorEmail: text("donor_email"),
    donorName: text("donor_name"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("donations_org_idx").on(t.organizationId),
    fundIdx: index("donations_fund_idx").on(t.fundId),
  }),
);

/** Sessões de presença/check-in (culto, escola dominical, evento). */
export const checkinEvents = pgTable(
  "checkin_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("checkin_events_org_idx").on(t.organizationId) }),
);

/**
 * CHECK-INS — alta responsabilidade (salvaguarda). Cada check-in gera um CÓDIGO
 * de segurança; a recolha SÓ é permitida com o código correspondente. Audita
 * QUEM fez check-in/out e QUANDO (rasto de pickup).
 */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => checkinEvents.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    code: text("code").notNull(), // tag de segurança (match obrigatório na recolha)
    checkedInBy: text("checked_in_by").references(() => authUser.id),
    checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
    checkedOutBy: text("checked_out_by").references(() => authUser.id),
    checkedOutAt: timestamp("checked_out_at"),
  },
  (t) => ({
    orgIdx: index("checkins_org_idx").on(t.organizationId),
    eventIdx: index("checkins_event_idx").on(t.eventId),
  }),
);

/** Modelos de mensagem reutilizáveis (email/sms/whatsapp/push). */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    channel: text("channel").notNull().default("email"),
    subject: text("subject"),
    body: text("body").notNull(),
  },
  (t) => ({ orgIdx: index("msg_templates_org_idx").on(t.organizationId) }),
);

/** Mensagens enviadas/agendadas (sem provider real ainda -> estado simulado). */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    channel: text("channel").notNull().default("email"),
    subject: text("subject"),
    body: text("body").notNull(),
    status: text("status").notNull().default("queued"), // queued | sent | failed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("messages_org_idx").on(t.organizationId) }),
);

/** Eventos com inscrição/RSVP. */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at").notNull().defaultNow(),
    location: text("location"),
    capacity: integer("capacity"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("events_org_idx").on(t.organizationId) }),
);

/** Inscrições em eventos (pessoa conhecida ou contacto avulso). */
export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    personId: uuid("person_id").references(() => people.id),
    name: text("name"),
    email: text("email"),
    status: text("status").notNull().default("registered"), // registered | cancelled
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("event_regs_org_idx").on(t.organizationId),
    eventIdx: index("event_regs_event_idx").on(t.eventId),
  }),
);

/** Grupos / células. `parentGroupId` regista a linhagem de multiplicação. */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    type: text("type").notNull().default("cell"), // cell | life_group | class | board
    parentGroupId: uuid("parent_group_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("groups_org_idx").on(t.organizationId) }),
);

/** Membros de um grupo (roster). */
export const groupMembers = pgTable(
  "group_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    role: text("role").notNull().default("member"), // member | leader
  },
  (t) => ({ pk: primaryKey({ columns: [t.groupId, t.personId] }) }),
);

/**
 * CONTAS financeiras. `communityId` NULL = conta ao nível da organização; preenchido
 * = conta de comunidade (sub-conta no modelo 'global', independente no 'autonomous').
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    communityId: uuid("community_id").references(() => communities.id),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("EUR"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("accounts_org_idx").on(t.organizationId) }),
);

/** Movimentos financeiros (receita/despesa). Dinheiro = inteiro minor + ISO 4217. */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    communityId: uuid("community_id").references(() => communities.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    type: text("type").notNull(), // income | expense
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    category: text("category"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("transactions_org_idx").on(t.organizationId),
    acctIdx: index("transactions_acct_idx").on(t.accountId),
  }),
);

/** Pedidos de oração. Visibilidade: public (mural) | private | confidential. */
export const prayerRequests = pgTable(
  "prayer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    title: text("title").notNull(),
    body: text("body"),
    visibility: text("visibility").notNull().default("public"),
    status: text("status").notNull().default("open"), // open | answered
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("prayer_org_idx").on(t.organizationId) }),
);

/** Casos de cuidado pastoral (visita, hospital, luto, aconselhamento). */
export const careCases = pgTable(
  "care_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    type: text("type").notNull().default("visit"),
    status: text("status").notNull().default("open"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("care_org_idx").on(t.organizationId) }),
);

/** Instalações: salas e reservas (prevenção de dupla marcação na ação). */
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  capacity: integer("capacity"),
}, (t) => ({ orgIdx: index("rooms_org_idx").on(t.organizationId) }));

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  roomId: uuid("room_id").notNull().references(() => rooms.id),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
}, (t) => ({ roomIdx: index("bookings_room_idx").on(t.roomId) }));

/** Missões: missionários e suporte. */
export const missionaries = pgTable("missionaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  field: text("field"),
  active: boolean("active").notNull().default(true),
}, (t) => ({ orgIdx: index("missionaries_org_idx").on(t.organizationId) }));

/** Média: sermões, podcast, devocionais. */
export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  type: text("type").notNull().default("sermon"),
  url: text("url"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
}, (t) => ({ orgIdx: index("media_org_idx").on(t.organizationId) }));

/** Multi-campus: segmentação por campus dentro do tenant. */
export const campuses = pgTable("campuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
}, (t) => ({ orgIdx: index("campuses_org_idx").on(t.organizationId) }));

/** Configuração de pagamentos ifthenpay por tenant (chaves = segredos). */
export const paymentConfigs = pgTable("payment_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id),
  gatewayKey: text("gateway_key"),
  mbwayKey: text("mbway_key"),
  mbKey: text("mb_key"),
  backofficeKey: text("backoffice_key"),
  antiPhishingKey: text("anti_phishing_key"),
  defaultMethod: text("default_method").notNull().default("mbway"),
  sandbox: boolean("sandbox").notNull().default(true),
  active: boolean("active").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ orgIdx: index("payment_configs_org_idx").on(t.organizationId) }));

/** Campanhas: meta, âmbito, período, tipo (única|recorrente). Progresso derivado. */
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  scope: text("scope").notNull().default("org"), // org | community | campus
  communityId: uuid("community_id").references(() => communities.id),
  fundId: uuid("fund_id").notNull().references(() => funds.id),
  targetMinor: integer("target_minor").notNull(),
  currency: text("currency").notNull().default("EUR"),
  type: text("type").notNull().default("one_time"), // one_time | recurring
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at"),
  active: boolean("active").notNull().default(true),
}, (t) => ({ orgIdx: index("campaigns_org_idx").on(t.organizationId) }));

/** Objetivos mensais por categoria (fundo): meta vs real (real = soma do mês). */
export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  fundId: uuid("fund_id").notNull().references(() => funds.id),
  month: text("month").notNull(), // 'YYYY-MM'
  targetMinor: integer("target_minor").notNull(),
  currency: text("currency").notNull().default("EUR"),
}, (t) => ({ orgIdx: index("objectives_org_idx").on(t.organizationId) }));
