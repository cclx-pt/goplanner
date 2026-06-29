"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, toAppLocale } from "@/i18n/config";

/**
 * Define a língua preferida do utilizador (cookie). Tem prioridade sobre o
 * default da organização. Revalida o layout para a UI re-renderizar traduzida.
 */
export async function setLocaleAction(value: string): Promise<void> {
  const locale = toAppLocale(value);
  if (!locale) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
