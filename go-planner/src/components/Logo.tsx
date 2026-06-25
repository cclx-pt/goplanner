/* eslint-disable @next/next/no-img-element -- logótipos SVG: <img> é o adequado */

/**
 * Logótipo completo empilhado (símbolo + nome + slogan) — para o ecrã de login.
 * SVG vetorial com fundo transparente (de public/logo).
 */
export function LogoFull({ className }: { className?: string }) {
  return (
    <img
      src="/logo/lockup-stacked-color.svg"
      alt="Go Planner — Organize today. Impact tomorrow."
      className={className}
    />
  );
}

/** Marca/ícone (só o símbolo) — para o canto esquerdo das páginas. */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo/symbol-color.svg"
      alt="Go Planner"
      width={size}
      height={size}
      className={className}
    />
  );
}
