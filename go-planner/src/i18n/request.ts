import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "./locale";

/**
 * Configuração por pedido do next-intl (setup SEM routing por locale — a língua
 * vem do cookie/organização, não do URL). Resolve a língua e carrega o catálogo
 * de mensagens correspondente.
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
