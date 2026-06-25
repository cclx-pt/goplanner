import { redirect } from "next/navigation";
import { getAccessState, type AccessContext } from "@/core/access/context";

/**
 * Guarda das páginas/ações de administração.
 * Defesa em profundidade: cada server action volta a chamar isto — nunca
 * confiar só no layout.
 */
export async function requireOrgAdmin(): Promise<AccessContext> {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  if (!state.ctx.isOrgAdmin) redirect("/dashboard");
  return state.ctx;
}
