"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/core/auth/client";
import { LogoFull } from "@/components/Logo";

export default function SignInPage() {
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
      setError(error.message ?? "Não foi possível iniciar sessão.");
      return;
    }
    // Navegação "dura" para a raiz: o servidor encaminha para o destino certo
    // (dashboard / plataforma / bootstrap). Evita o estado preso na soft-nav.
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <LogoFull className="mb-6 h-auto w-52 self-center" />
      <h1 className="text-2xl font-bold text-brand-navy">Iniciar sessão</h1>
      <p className="mt-1 text-sm text-gray-500">Bem-vindo de volta ao Go Planner.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="tu@igreja.pt"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">Palavra-passe</span>
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
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        Ainda não tens conta?{" "}
        <Link href="/sign-up" className="font-medium text-brand-blue hover:underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
