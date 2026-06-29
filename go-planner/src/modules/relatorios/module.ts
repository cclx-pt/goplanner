import { defineModule } from "@/core/modules/contract";

/** Módulo RELATÓRIOS — KPIs read-only agregando os outros módulos. */
export const relatoriosModule = defineModule({
  key: "relatorios",
  name: "Relatórios",
  version: "1.0.0",
  description: "Painéis de presença, doações, funil de discipulado e crescimento.",
  permissions: [{ key: "relatorios.painel.ver", label: "Ver relatórios" }],
  navigation: [
    { label: "Relatórios", route: "/relatorios", requires: "relatorios.painel.ver", order: 80 },
  ],
});
