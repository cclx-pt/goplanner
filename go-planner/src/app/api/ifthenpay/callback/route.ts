import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { donations } from "@/core/db/schema";

/**
 * Callback do ifthenpay (via Pipedream) — confirma o pagamento. Marca a doação
 * como `paid` por `ref` (id da doação). Valida um segredo partilhado por env.
 */
export async function POST(req: Request) {
  if (process.env.IFTHENPAY_CALLBACK_SECRET) {
    if (req.headers.get("x-callback-secret") !== process.env.IFTHENPAY_CALLBACK_SECRET) {
      return new Response("403", { status: 403 });
    }
  }
  let body: { ref?: string; status?: string } = {};
  try { body = await req.json(); } catch { return new Response("400", { status: 400 }); }
  if (!body.ref) return new Response("400", { status: 400 });
  await db.update(donations).set({ status: body.status === "failed" ? "failed" : "paid" }).where(eq(donations.id, body.ref));
  return new Response("ok");
}
