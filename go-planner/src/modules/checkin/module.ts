import { defineModule } from "@/core/modules/contract";

/** Módulo CHECK-IN — presenças e check-in seguro de crianças (tag-matching). */
export const checkinModule = defineModule({
  key: "checkin",
  name: "Check-in",
  version: "1.0.0",
  description: "Presenças e check-in seguro com código (salvaguarda).",
  permissions: [
    { key: "checkin.checkin.ver", label: "Ver check-ins" },
    { key: "checkin.checkin.registar", label: "Registar check-in/out" },
  ],
  navigation: [
    { label: "Check-in", route: "/checkin", requires: "checkin.checkin.ver", order: 30 },
  ],
});
