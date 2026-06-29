import { defineModule } from "@/core/modules/contract";

/** Módulo DOAÇÕES — fundos + registo de doações (sobre o core de dinheiro). */
export const doacoesModule = defineModule({
  key: "doacoes",
  name: "Doações",
  version: "1.0.0",
  description: "Fundos, dízimos, ofertas e campanhas (multi-moeda).",
  permissions: [
    { key: "doacoes.doacao.ver", label: "Ver doações" },
    { key: "doacoes.doacao.registar", label: "Registar doações" },
  ],
  navigation: [
    { label: "Doações", route: "/doacoes", requires: "doacoes.doacao.ver", order: 20 },
  ],
});
