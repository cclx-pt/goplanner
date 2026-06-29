import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/core/db";
import { mediaItems } from "@/core/db/schema";
import { tenantFilter } from "@/core/db/tenant";
import { getAccessState, canHere } from "@/core/access/context";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { createMediaAction } from "./actions";

const TYPES: Record<string, string> = { sermon: "Sermão", podcast: "Podcast", devotional: "Devocional", stream: "Livestream" };

export default async function MediaPage() {
  const state = await getAccessState();
  if (state.status !== "ok") redirect("/dashboard");
  const { ctx } = state;
  if (!(await canHere(ctx, "media.item.ver", "media"))) redirect("/dashboard");
  const canEdit = await canHere(ctx, "media.item.gerir", "media");
  const rows = await db.select().from(mediaItems).where(tenantFilter(mediaItems, ctx.organizationId)).orderBy(desc(mediaItems.publishedAt)).limit(30);
  const input = "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopNav nav={[{ label: "Minha página", href: "/dashboard" }]} user={{ name: ctx.name, email: ctx.email }} breadcrumb={[{ label: ctx.organizationName, href: "/dashboard" }, { label: "Média" }]} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <h1 className="text-xl font-bold text-brand-navy">Média</h1>
        <p className="mt-1 text-sm text-gray-500">Sermões, podcast e devocionais.</p>
        {canEdit && (<form action={createMediaAction} className="mt-5 flex flex-wrap gap-2"><input name="title" required placeholder="Título" className={`flex-1 ${input}`} /><select name="type" defaultValue="sermon" className={input}><option value="sermon">Sermão</option><option value="podcast">Podcast</option><option value="devotional">Devocional</option><option value="stream">Livestream</option></select><input name="url" placeholder="URL" className={input} /><button className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white">Publicar</button></form>)}
        <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">{rows.length === 0 ? <li className="p-4 text-sm text-gray-400">Sem média.</li> : rows.map((m) => <li key={m.id} className="p-3 text-sm"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{TYPES[m.type] ?? m.type}</span> {m.title}</li>)}</ul>
      </main>
      <Footer />
    </div>
  );
}
