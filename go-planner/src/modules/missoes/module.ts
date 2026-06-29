import { defineModule } from "@/core/modules/contract";
export const missoesModule = defineModule({
  key: "missoes", name: "Missões", version: "1.0.0",
  description: "Missionários, suporte e projetos de evangelismo.",
  permissions: [{ key: "missoes.missao.ver", label: "Ver missões" }, { key: "missoes.missao.gerir", label: "Gerir missões" }],
  navigation: [{ label: "Missões", route: "/missoes", requires: "missoes.missao.ver", order: 110 }],
});
