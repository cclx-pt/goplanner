import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { paymentConfigs } from "@/core/db/schema";
import { requireOrgAdmin } from "../guard";
import { savePaymentConfigAction } from "./actions";

export default async function PagamentosPage() {
  const ctx = await requireOrgAdmin();
  const [cfg] = await db.select().from(paymentConfigs).where(eq(paymentConfigs.organizationId, ctx.organizationId)).limit(1);
  const set = (v: string | null | undefined) => (v ? "•••• definido" : "");
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  const keys: [string, string, string | null | undefined][] = [
    ["mbwayKey", "MB WAY Key", cfg?.mbwayKey], ["mbKey", "MB Key (Multibanco)", cfg?.mbKey],
    ["gatewayKey", "Gateway Key (Pay by Link)", cfg?.gatewayKey], ["backofficeKey", "Backoffice Key (callbacks)", cfg?.backofficeKey],
    ["antiPhishingKey", "Anti-phishing Key", cfg?.antiPhishingKey],
  ];
  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">Pagamentos (ifthenpay)</h1>
      <p className="mt-1 text-sm text-gray-500">Configura as chaves por método. Campos vazios mantêm o valor atual; nunca mostramos a chave.</p>
      <form action={savePaymentConfigAction} className="mt-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
        {keys.map(([k, label, val]) => (
          <label key={k} className="flex flex-col gap-1 text-sm"><span className="text-gray-500">{label}</span>
            <input name={k} placeholder={set(val) || "—"} className={input} /></label>
        ))}
        <label className="flex flex-col gap-1 text-sm"><span className="text-gray-500">Método por defeito</span>
          <select name="defaultMethod" defaultValue={cfg?.defaultMethod ?? "mbway"} className={input}><option value="mbway">MB WAY</option><option value="multibanco">Multibanco</option><option value="gateway">Gateway</option></select></label>
        <div className="flex items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sandbox" defaultChecked={cfg?.sandbox ?? true} /> Sandbox</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={cfg?.active ?? false} /> Ativo</label>
          <button className="ml-auto rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Guardar</button>
        </div>
      </form>
      <p className="mt-3 text-xs text-gray-400">Callback: configura no backoffice ifthenpay o URL <code>/api/ifthenpay/callback</code>. Estado: {cfg?.active ? "ATIVO" : "inativo"} · {cfg?.sandbox ? "sandbox" : "produção"}.</p>
    </div>
  );
}
