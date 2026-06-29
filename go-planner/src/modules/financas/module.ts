import { defineModule } from "@/core/modules/contract";

/** Módulo FINANÇAS — contas + movimentos, perspetiva org + comunidade. */
export const financasModule = defineModule({
  key: "financas",
  name: "Finanças",
  version: "1.0.0",
  description: "Contas, receitas/despesas, orçamentos; org + comunidades.",
  permissions: [
    { key: "financas.financa.ver", label: "Ver finanças" },
    { key: "financas.financa.gerir", label: "Gerir finanças" },
  ],
  navigation: [
    { label: "Finanças", route: "/financas", requires: "financas.financa.ver", order: 70 },
  ],
});
