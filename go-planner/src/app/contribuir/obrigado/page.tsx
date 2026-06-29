import Link from "next/link";
import { LogoFull } from "@/components/Logo";

export default function ObrigadoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-8 text-center">
      <LogoFull className="mb-6 h-auto w-44" />
      <h1 className="text-2xl font-bold text-brand-navy">Obrigado pela contribuição!</h1>
      <p className="mt-2 text-sm text-gray-600">Por favor, valide o pagamento no seu MBWay.</p>
      <p className="mt-4 max-w-xs text-xs italic text-gray-400">
        “Cada um contribua segundo propôs no seu coração… porque Deus ama ao que dá com alegria.” 2 Cor 9:7
      </p>
      <Link href="/contribuir" className="mt-6 rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Contribuir novamente</Link>
    </main>
  );
}
