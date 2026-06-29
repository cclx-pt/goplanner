/**
 * Constantes de i18n SEM dependências de servidor — seguras para importar em
 * componentes cliente (o resolver server-only vive em ./locale.ts).
 */
export const LOCALES = ["pt", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "pt";
export const LOCALE_COOKIE = "goplanner.locale";

/** Reduz um BCP-47 (ou código simples) a uma língua suportada (pt-PT -> pt). */
export function toAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const lang = value.toLowerCase().split("-")[0];
  return (LOCALES as readonly string[]).includes(lang)
    ? (lang as AppLocale)
    : null;
}
