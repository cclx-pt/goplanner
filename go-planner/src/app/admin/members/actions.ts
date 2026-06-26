"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/core/db";
import { users, memberships, roles } from "@/core/db/schema";
import { user as authUser, account as authAccount } from "@/core/auth/schema";
import { requireOrgAdmin } from "../guard";

/**
 * Cria um novo utilizador na organização efetiva, com um role escolhido.
 *
 * Cria a identidade do Better Auth (user + account com password em hash) por
 * inserção DIRETA — não usa `signUpEmail` porque essa abriria sessão e deslogava
 * o admin atual. Depois cria o utilizador de domínio e a membership ao NÍVEL da
 * organização (community_id NULL). Reservado a admins (requireOrgAdmin).
 */
export async function createMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!name || !email || password.length < 8 || !roleId) return;

  // O role tem de pertencer à organização efetiva.
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, ctx.organizationId)))
    .limit(1);
  if (!role) return;

  // Email já usado? (identidade ou domínio) -> aborta.
  const [existingAuth] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  const [existingDomain] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingAuth || existingDomain) return;

  const hashed = await hashPassword(password);
  const authUserId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(authUser).values({
      id: authUserId,
      name,
      email,
      emailVerified: false,
    });
    await tx.insert(authAccount).values({
      id: randomUUID(),
      userId: authUserId,
      accountId: authUserId,
      providerId: "credential",
      password: hashed,
    });

    const [domainUser] = await tx
      .insert(users)
      .values({ organizationId: ctx.organizationId, email, name, authUserId })
      .returning({ id: users.id });

    await tx.insert(memberships).values({
      userId: domainUser.id,
      communityId: null,
      roleId,
    });
  });

  revalidatePath("/admin/members");
}
