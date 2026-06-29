/**
 * Núcleo de DINHEIRO.
 *
 * Decisão de arquitetura (i18n/multi-moeda): NUNCA usar float para dinheiro.
 * Guardar sempre como INTEIRO em **unidades menores** (cêntimos) + código de
 * moeda **ISO 4217**. A moeda é um atributo da organização/campus/fundo, não uma
 * constante global. Lida com moedas de zero casas (ex.: JPY) e arredondamento
 * por moeda. Separar a moeda de *exibição* da de *liquidação* (futuro Giving).
 */

/** Valor monetário: inteiro em unidades menores + moeda ISO 4217. */
export interface Money {
  /** Unidades menores (cêntimos). Inteiro — ex.: 1050 = 10,50 €. */
  minor: number;
  /** Código ISO 4217 (ex.: "EUR", "USD", "JPY"). */
  currency: string;
}

/**
 * Moedas SEM casas decimais (ISO 4217 exponent 0). Para estas, a unidade menor
 * é a própria unidade. Lista não-exaustiva das mais comuns.
 */
const ZERO_DECIMAL = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "XAF",
  "XOF",
  "XPF",
  "BIF",
  "DJF",
  "GNF",
  "KMF",
  "RWF",
  "UGX",
  "PYG",
  "ISK",
]);

/** Moedas com 3 casas decimais (ISO 4217 exponent 3). */
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

/** Nº de casas decimais (expoente ISO 4217) de uma moeda. Default 2. */
export function decimalsFor(currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/** Cria um `Money` a partir de um valor "maior" (ex.: 10,50) — arredonda. */
export function fromMajor(major: number, currency: string): Money {
  const factor = 10 ** decimalsFor(currency);
  return { minor: Math.round(major * factor), currency: currency.toUpperCase() };
}

/** Converte um `Money` para o valor "maior" (ex.: 1050 -> 10.5). */
export function toMajor(money: Money): number {
  return money.minor / 10 ** decimalsFor(money.currency);
}

/**
 * Formata um `Money` para exibição, sensível ao locale (BCP-47) e à moeda.
 * Usa `Intl.NumberFormat` (nativo) — sem dependências.
 */
export function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(toMajor(money));
}

/** Soma valores na MESMA moeda (lança se misturar moedas). */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Não somar moedas diferentes: ${a.currency} ≠ ${b.currency}`);
  }
  return { minor: a.minor + b.minor, currency: a.currency };
}
