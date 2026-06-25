import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";

/**
 * Schema interno do módulo Escalas (tradução do ERD).
 *
 * REGRA DE SCOPING: organization_id + community_id são denormalizados nas
 * tabelas de topo (e, em produção, também nas filhas) para a camada de acessos
 * filtrar por âmbito sem JOINs em cada verificação.
 *
 * FRONTEIRAS DO MÓDULO:
 *  - person_id  -> referência ESTÁVEL ao núcleo (utilizador/membership).
 *                  Escalas não possui uma tabela de pessoas.
 *  - event_id   -> gancho OPCIONAL para o módulo Eventos (nullable).
 */

export const escTeams = pgTable(
  "esc_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    communityId: uuid("community_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => ({
    scopeIdx: index("esc_teams_scope_idx").on(t.organizationId, t.communityId),
  }),
);

export const escPositions = pgTable("esc_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => escTeams.id),
  name: text("name").notNull(),
});

export const escOccasions = pgTable(
  "esc_occasions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id").notNull(),
    dataHora: timestamp("data_hora").notNull(),
    // Gancho opcional para Eventos. NULL = ocasião autónoma.
    eventId: uuid("event_id"),
  },
  (t) => ({
    communityIdx: index("esc_occasions_community_idx").on(t.communityId),
  }),
);

export const escSlots = pgTable("esc_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  occasionId: uuid("occasion_id")
    .notNull()
    .references(() => escOccasions.id),
  positionId: uuid("position_id")
    .notNull()
    .references(() => escPositions.id),
  necessarios: integer("necessarios").notNull().default(1),
});

export const escAssignments = pgTable(
  "esc_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => escSlots.id),
    // Referência estável ao núcleo (não é FK para uma tabela do módulo).
    personId: uuid("person_id").notNull(),
    // convidado | confirmado | recusado
    estado: text("estado").notNull().default("convidado"),
  },
  (t) => ({
    personIdx: index("esc_assignments_person_idx").on(t.personId),
  }),
);

export const escAvailability = pgTable(
  "esc_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    disponivel: boolean("disponivel").notNull().default(false),
  },
  (t) => ({
    personIdx: index("esc_availability_person_idx").on(t.personId),
  }),
);
