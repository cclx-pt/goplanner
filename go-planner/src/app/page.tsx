export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold text-brand-navy">Go Planner</h1>
      <p className="mt-1 text-lg">
        <span className="text-brand-navy">Organize today. </span>
        <span className="text-brand-green">Impact tomorrow.</span>
      </p>

      <p className="mt-6 text-gray-600">
        Fundação da plataforma pronta. Próximo passo: autenticação e o painel de
        administração (Fase 1).
      </p>

      <div className="mt-6 flex gap-2">
        <span className="h-3 w-3 rounded-full bg-brand-green" />
        <span className="h-3 w-3 rounded-full bg-brand-blue" />
        <span className="h-3 w-3 rounded-full bg-brand-purple" />
        <span className="h-3 w-3 rounded-full bg-brand-amber" />
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Vê o <code>README.md</code> e a pasta <code>docs/</code> para a
        arquitetura.
      </p>
    </main>
  );
}
