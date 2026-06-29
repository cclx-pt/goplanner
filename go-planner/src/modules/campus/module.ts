import { defineModule } from "@/core/modules/contract";
export const campusModule = defineModule({
  key: "campus", name: "Campus", version: "1.0.0",
  description: "Multi-campus: segmentação e relatórios por campus.",
  permissions: [{ key: "campus.campus.ver", label: "Ver campus" }, { key: "campus.campus.gerir", label: "Gerir campus" }],
  navigation: [{ label: "Campus", route: "/campus", requires: "campus.campus.ver", order: 130 }],
});
