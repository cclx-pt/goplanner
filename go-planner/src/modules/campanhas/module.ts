import { defineModule } from "@/core/modules/contract";
export const campanhasModule = defineModule({
  key: "campanhas", name: "Campanhas", version: "1.0.0",
  description: "Campanhas de angariação + objetivos mensais por categoria.",
  permissions: [{ key: "campanhas.campanha.ver", label: "Ver campanhas" }, { key: "campanhas.campanha.gerir", label: "Gerir campanhas" }],
  navigation: [{ label: "Campanhas", route: "/campanhas", requires: "campanhas.campanha.ver", order: 25 }],
});
