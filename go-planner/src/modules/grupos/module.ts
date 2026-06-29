import { defineModule } from "@/core/modules/contract";

/** Módulo GRUPOS — células/grupos, roster e linhagem de multiplicação. */
export const gruposModule = defineModule({
  key: "grupos",
  name: "Grupos",
  version: "1.0.0",
  description: "Células, grupos de vida e discipulado (roster + multiplicação).",
  permissions: [
    { key: "grupos.grupo.ver", label: "Ver grupos" },
    { key: "grupos.grupo.gerir", label: "Gerir grupos" },
  ],
  navigation: [
    { label: "Grupos", route: "/grupos", requires: "grupos.grupo.ver", order: 60 },
  ],
});
