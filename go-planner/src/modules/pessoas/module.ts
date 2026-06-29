import { defineModule } from "@/core/modules/contract";

/**
 * Módulo PESSOAS — a espinha do data-plane. As tabelas (people, households,
 * tags, milestones) vivem no core; o módulo declara permissões e navegação.
 */
export const pessoasModule = defineModule({
  key: "pessoas",
  name: "Pessoas",
  version: "1.0.0",
  description: "Pessoas, agregados familiares, ciclo de vida e marcos.",
  permissions: [
    { key: "pessoas.pessoa.ver", label: "Ver pessoas" },
    { key: "pessoas.pessoa.editar", label: "Editar pessoas" },
  ],
  navigation: [
    { label: "Pessoas", route: "/pessoas", requires: "pessoas.pessoa.ver", order: 10 },
  ],
});
