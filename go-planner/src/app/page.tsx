import { redirect } from "next/navigation";
import { getAccessState } from "@/core/access/context";

/** Entrada inteligente: encaminha conforme o estado de autenticação/bootstrap. */
export default async function Home() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "unbootstrapped") redirect("/bootstrap");
  redirect("/dashboard");
}
