"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Cliente de autenticação no browser. Por defeito usa o mesmo domínio da app.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
