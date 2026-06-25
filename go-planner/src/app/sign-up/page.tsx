"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/core/auth/client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível criar a conta.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <h1 className="text-2xl font-bold text-brand-navy">Criar conta</h1>
      <p className="mt-1 text-sm text-gray-500">
        <span className="text-brand-navy">Organize today. </span>
        <span className="text-brand-green">Impact tomorrow.</span>
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">Nome</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="O teu nome"
          />
        </label>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-green px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "A criar…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        Já tens conta?{" "}
        <Link href="/sign-in" className="font-medium text-brand-blue hover:underline">
          Iniciar sessão
        </Link>
      </p>
    </main>
  );
}
