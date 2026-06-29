import { defineModule } from "@/core/modules/contract";
export const mediaModule = defineModule({
  key: "media", name: "Média", version: "1.0.0",
  description: "Sermões, podcast, devocionais e livestream.",
  permissions: [{ key: "media.item.ver", label: "Ver média" }, { key: "media.item.gerir", label: "Gerir média" }],
  navigation: [{ label: "Média", route: "/media", requires: "media.item.ver", order: 120 }],
});
