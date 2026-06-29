import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { organizations } from "@/core/db/schema";
import { ACTIVE_ORG_COOKIE } from "@/core/access/context";
import { type AppLocale, DEFAULT_LOCALE, LOCALE_COOKIE, toAppLocale } from "./config";

/** Língua default da organização ATIVA (via cookie de org ativa). */
async function orgDefaultLocale(): Promise<AppLocale | null> {
  const activeOrg = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrg) return null;
  const [org] = await db
    .select({ locale: organizations.locale })
    .from(organizations)
    .where(eq(organizations.id, activeOrg))
    .limit(1);
  return toAppLocale(org?.locale);
}

/**
 * Resolve a língua ativa, por ordem de prioridade:
 *   1. preferência do utilizador (cookie `goplanner.locale`)
 *   2. default da organização ativa (`organizations.locale`)
 *   3. default do sistema (pt)
 */
export async function resolveLocale(): Promise<AppLocale> {
  const pref = toAppLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (pref) return pref;
  return (await orgDefaultLocale()) ?? DEFAULT_LOCALE;
}
