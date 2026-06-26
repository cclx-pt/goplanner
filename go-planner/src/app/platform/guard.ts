import { redirect } from "next/navigation";
import { getAuthSession } from "@/core/auth/session";
import { ensurePlatformAdmin, type PlatformAdmin } from "@/core/platform/access";

/**
 * Guarda das páginas/ações da torre de controlo (plataforma).
 *
 * Defesa em profundidade: cada page e server action volta a chamar isto — nunca
 * confiar só no layout. Provisiona (JIT) quem estiver na allowlist e devolve o
 * platform admin; caso contrário encaminha (anónimo → login, autenticado sem
 * acesso → dashboard).
 */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const admin = await ensurePlatformAdmin();
  if (admin) return admin;

  const session = await getAuthSession();
  redirect(session ? "/dashboard" : "/sign-in");
}
