"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "@/core/auth/client";
import { LogoFull } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const t = useTranslations("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? t("error"));
      return;
    }
    // Navegação "dura" para a raiz: o servidor encaminha para o destino certo
    // (dashboard / plataforma / bootstrap). Evita o estado preso na soft-nav.
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <LogoFull className="mb-6 h-auto w-52 self-center" />
      <h1 className="text-2xl font-bold text-brand-navy">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">{t("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder={t("emailPlaceholder")}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">{t("password")}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="••••••••"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-blue px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-brand-blue hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </main>
  );
}
