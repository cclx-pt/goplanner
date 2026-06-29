import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/core/db";
import { messages } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { sendBroadcastAction } from "./actions";

export default async function ComunicacaoPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "comunicacao.mensagem.ver", "comunicacao"))) redirect("/dashboard");
  const canSend = await canHere(ctx, "comunicacao.mensagem.enviar", "comunicacao");

  const recent = await db
    .select({
      id: messages.id,
      channel: messages.channel,
      body: messages.body,
      status: messages.status,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(tenantFilter(messages, ctx.organizationId))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav
        nav={[{ label: "Minha página", href: "/dashboard" }]}
        user={{ name: ctx.name, email: ctx.email }}
        breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Comunicação" }]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Comunicação</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envios segmentados. Workflows também podem enviar (ação send_message).
        </p>

        {canSend && (
          <form action={sendBroadcastAction} className="mt-5 grid gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <select name="channel" defaultValue="email" className={input}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input name="subject" placeholder="Assunto" className={`flex-1 ${input}`} />
            </div>
            <textarea name="body" required rows={3} placeholder="Mensagem para todos…" className={input} />
            <div>
              <button className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white">
                Enviar a todos
              </button>
            </div>
          </form>
        )}

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Recentes</h2>
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {recent.length === 0 ? (
            <li className="p-4 text-sm text-gray-400">Sem mensagens.</li>
          ) : (
            recent.map((m) => (
              <li key={m.id} className="p-3 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-brand-navy">{m.channel}</span>
                {" · "}{m.status}{" · "}{m.body.slice(0, 60)}
              </li>
            ))
          )}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
