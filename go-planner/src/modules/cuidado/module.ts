import { defineModule } from "@/core/modules/contract";

/** Módulo CUIDADO — oração + casos de cuidado pastoral (tiers de confidencialidade). */
export const cuidadoModule = defineModule({
  key: "cuidado",
  name: "Cuidado",
  version: "1.0.0",
  description: "Pedidos de oração e casos de cuidado pastoral.",
  permissions: [
    { key: "cuidado.cuidado.ver", label: "Ver cuidado" },
    { key: "cuidado.cuidado.gerir", label: "Gerir cuidado" },
  ],
  navigation: [
    { label: "Cuidado", route: "/cuidado", requires: "cuidado.cuidado.ver", order: 90 },
  ],
});
