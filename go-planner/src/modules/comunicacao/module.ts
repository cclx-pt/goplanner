import { defineModule } from "@/core/modules/contract";

/** Módulo COMUNICAÇÃO — mensagens segmentadas + modelos; alvo de workflows. */
export const comunicacaoModule = defineModule({
  key: "comunicacao",
  name: "Comunicação",
  version: "1.0.0",
  description: "Mensagens (email/SMS/WhatsApp), modelos e envios segmentados.",
  permissions: [
    { key: "comunicacao.mensagem.ver", label: "Ver mensagens" },
    { key: "comunicacao.mensagem.enviar", label: "Enviar mensagens" },
  ],
  navigation: [
    { label: "Comunicação", route: "/comunicacao", requires: "comunicacao.mensagem.ver", order: 40 },
  ],
});
