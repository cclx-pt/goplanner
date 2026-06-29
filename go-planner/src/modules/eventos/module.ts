import { defineModule } from "@/core/modules/contract";

/** Módulo EVENTOS — eventos, inscrições/RSVP. */
export const eventosModule = defineModule({
  key: "eventos",
  name: "Eventos",
  version: "1.0.0",
  description: "Eventos, calendário e inscrições (RSVP).",
  permissions: [
    { key: "eventos.evento.ver", label: "Ver eventos" },
    { key: "eventos.evento.gerir", label: "Gerir eventos" },
  ],
  navigation: [
    { label: "Eventos", route: "/eventos", requires: "eventos.evento.ver", order: 50 },
  ],
});
