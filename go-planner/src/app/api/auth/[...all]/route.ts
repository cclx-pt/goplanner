import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/core/auth";

/**
 * Monta o handler do Better Auth em /api/auth/*.
 * Trata sign-up, sign-in, sign-out, sessão, etc.
 */
export const { GET, POST } = toNextJsHandler(auth);
