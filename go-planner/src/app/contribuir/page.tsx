import { asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { communities, funds, people } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState } from "@/core/access/context";
import { LogoFull } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { createPublicDonationAction, publicOrg } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContribuirPage() {
  const org = await publicOrg();
  if (!org) return <main className="p-8">Sem organização.</main>;
  const comms = await db.select({ id: communities.id, name: communities.name }).from(communities).where(tenantFilter(communities, org.id)).orderBy(asc(communities.name));
  const fnds = await db.select({ id: funds.id, name: funds.name }).from(funds).where(tenantFilter(funds, org.id)).orderBy(asc(funds.name));
  const st = await getAccessState();
  const me = st.status === "ok" && st.ctx.personId ? (await db.select({ nif: people.nif, email: people.email, name: people.name }).from(people).where(eq(people.id, st.ctx.personId)).limit(1))[0] : null;
  const input = "rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="mx-auto w-full max-w-md flex-1 p-6">
        <LogoFull className="mx-auto mb-4 h-auto w-44" />
        <h1 className="text-center text-2xl font-bold text-brand-navy">Contribuir</h1>
        <p className="mt-1 text-center text-sm text-gray-500">{org.name} · pagamento MBWay (ifthenpay)</p>
        {me && <p className="mt-2 text-center text-xs text-brand-green">Sessão iniciada — dados preenchidos. <a href="/portal" className="underline">Histórico</a></p>}
        <form action={createPublicDonationAction} className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5">
          <input name="amount" required placeholder="Valor (€)" className={input} />
          <input name="phone" required placeholder="Telemóvel (MBWay)" className={input} />
          <select name="communityId" defaultValue="" className={input}><option value="">Comunidade…</option>{comms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="fundId" required defaultValue="" className={input}><option value="" disabled>Categoria…</option>{fnds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <details><summary className="cursor-pointer text-sm text-brand-blue">NIF para recibo (opcional)</summary>
            <div className="mt-2 flex flex-col gap-2">
              <input name="nif" defaultValue={me?.nif ?? ""} placeholder="NIF" className={input} />
              <input name="email" defaultValue={me?.email ?? ""} placeholder="Email" className={input} />
              <input name="name" defaultValue={me?.name ?? ""} placeholder="Nome" className={input} />
            </div>
          </details>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" name="recurrence" /> Repetir mensalmente</label>
          <button className="rounded-md bg-brand-green px-4 py-2 font-medium text-white">Contribuir</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
