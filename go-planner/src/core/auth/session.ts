import { headers } from "next/headers";
import { auth } from "./index";

/**
 * Sessão do Better Auth no servidor (RSC, server actions, route handlers).
 * Devolve `{ user, session }` ou `null` se não houver sessão válida.
 */
export async function getAuthSession() {
  return auth.api.getSession({ headers: await headers() });
}
