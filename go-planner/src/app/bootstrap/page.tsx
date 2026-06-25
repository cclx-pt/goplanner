import { redirect } from "next/navigation";
import { getAccessState } from "@/core/access/context";
import { createOrganizationAction } from "./actions";
import { LogoMark } from "@/components/Logo";

export default async function BootstrapPage() {
  const state = await getAccessState();
  if (state.status === "anon") redirect("/sign-in");
  if (state.status === "ok") redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <LogoMark size={40} className="mb-4" />
      <h1 className="text-2xl font-bold text-brand-navy">Criar a tua organização</h1>
      <p className="mt-1 text-sm text-gray-500">
        Olá{state.name ? `, ${state.name}` : ""}. Dá um nome à tua organização
        (a igreja) e, opcionalmente, à primeira comunidade. Ficas como
        administrador da organização.
      </p>

      <form action={createOrganizationAction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">Nome da organização</span>
          <input
            name="orgName"
            type="text"
            required
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="Ex.: Igreja Central"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-brand-navy">
            Primeira comunidade <span className="text-gray-400">(opcional)</span>
          </span>
          <input
            name="communityName"
            type="text"
            className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue"
            placeholder="Ex.: Sede"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-brand-green px-4 py-2 font-medium text-white transition hover:opacity-90"
        >
          Criar organização
        </button>
      </form>
    </main>
  );
}
