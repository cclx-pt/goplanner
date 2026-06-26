export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Administração</h1>
      <p className="mt-2 text-sm text-gray-600">
        Gere a organização: vê a organização (raiz do tenant, apenas leitura), as
        comunidades, os membros, os roles (com permissões) e os módulos ativos.
        Escolhe uma secção no menu à esquerda.
      </p>
    </div>
  );
}
