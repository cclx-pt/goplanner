import { redirect } from "next/navigation";
import { getAccessState } from "@/core/access/context";
import { isPlatformCandidate } from "@/core/platform/access";

/** Entrada inteligente: encaminha conforme o estado de autenticação/bootstrap. */
export default async function Home() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") {
    // Staff da plataforma (sem organização) vai para a torre de controlo.
    if (await isPlatformCandidate()) redirect("/platform");
    redirect("/bootstrap");
  }
  redirect("/dashboard");
}
