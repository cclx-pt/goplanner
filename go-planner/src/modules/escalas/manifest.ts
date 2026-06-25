import { defineModule } from "@/core/modules/contract";

/**
 * Módulo Escalas — rotas de voluntários.
 *
 * Primeiro módulo depois do núcleo. Não tem dependências HARD: as pessoas a
 * escalar vêm do núcleo (utilizadores + memberships). Eventos é uma integração
 * OPCIONAL via barramento de eventos, não um dependsOn.
 */
export default defineModule({
  key: "escalas",
  name: "Escalas",
  version: "0.1.0",
  description: "Gestão de rotas e escalas de voluntários por comunidade.",
  dependsOn: [], // sem dependências hard

  permissions: [
    { key: "escalas.escala.ver", label: "Ver escalas" },
    { key: "escalas.escala.criar", label: "Criar escalas" },
    { key: "escalas.escala.editar", label: "Editar escalas" },
    { key: "escalas.atribuicao.confirmar", label: "Confirmar atribuição" },
  ],

  navigation: [
    {
      label: "Escalas",
      icon: "calendar",
      route: "/escalas",
      requires: "escalas.escala.ver",
    },
  ],

  events: {
    emits: ["escalas.atribuicao.criada", "escalas.atribuicao.confirmada"],
    // Integração opcional: se Eventos existir, criar ocasião a partir do evento.
    consumes: ["eventos.evento.criado"],
  },

  settings: {
    scope: "community",
    schema: {
      permitirTrocas: { type: "boolean", default: true },
      antecedenciaConvite: { type: "number", default: 14, min: 1, max: 90 },
    },
  },

  lifecycle: {
    onEnable: async () => {
      /* seed de posições/equipas por defeito, se quiseres */
    },
    onDisable: async () => {
      /* arquivar dados, nunca apagar */
    },
  },
});
