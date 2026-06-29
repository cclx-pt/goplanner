"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/config";
import { setLocaleAction } from "@/app/actions/locale";

/** Seletor de idioma. Define a preferência do utilizador (cookie). */
export function LanguageSwitcher() {
  const active = useLocale();
  const t = useTranslations("locale");
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5"
    >
      {LOCALES.map((l) => {
        const isActive = l === active;
        return (
          <button
            key={l}
            type="button"
            disabled={pending || isActive}
            aria-pressed={isActive}
            onClick={() => startTransition(() => setLocaleAction(l))}
            className={`rounded px-2 py-0.5 text-xs font-medium uppercase transition disabled:cursor-default ${
              isActive
                ? "bg-brand-blue text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
