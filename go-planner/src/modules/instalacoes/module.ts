import { defineModule } from "@/core/modules/contract";
export const instalacoesModule = defineModule({
  key: "instalacoes", name: "Instalações", version: "1.0.0",
  description: "Salas e reservas com prevenção de dupla marcação.",
  permissions: [{ key: "instalacoes.sala.ver", label: "Ver instalações" }, { key: "instalacoes.sala.gerir", label: "Gerir instalações" }],
  navigation: [{ label: "Instalações", route: "/instalacoes", requires: "instalacoes.sala.ver", order: 100 }],
});
