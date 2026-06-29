"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/core/db";
import { people, memberships, roles, consents } from "@/core/db/schema";
import { user as authUser, account as authAccount } from "@/core/auth/schema";
import { dispatch } from "@/core/workflows";
import { requireOrgAdmin } from "../guard";

/**
 * Cria um novo membro na organização efetiva, com um role escolhido.
 *
 * Cria a identidade GLOBAL do Better Auth (user + account com password em hash)
 * por inserção DIRETA — não usa `signUpEmail` porque essa abriria sessão e
 * deslogava o admin atual. Depois cria o registo de DOMÍNIO (Person) no tenant e
 * a Membership que liga a conta global ao tenant (community_id NULL = org-wide).
 * Reservado a admins (requireOrgAdmin).
 */
export async function createMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  // GDPR: consentimento explícito para tratamento de dados (capturado na criação).
  const consentProcessing = formData.get("consent") != null;
  const STAGES = ["visitor", "first_timer", "regular", "member", "leader"];
  const rawStage = String(formData.get("lifecycleStage") ?? "visitor");
  const lifecycleStage = STAGES.includes(rawStage) ? rawStage : "visitor";
  if (!name || !email || password.length < 8 || !roleId) return;

  // O role tem de pertencer à organização efetiva.
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, ctx.organizationId)))
    .limit(1);
  if (!role) return;

  // Conta global já existe com este email? -> aborta (login é único na plataforma).
  const [existingAuth] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  // Já existe uma pessoa com este email NESTE tenant? -> aborta (duplicado).
  const [existingPerson] = await db
    .select({ id: people.id })
    .from(people)
    .where(
      and(eq(people.organizationId, ctx.organizationId), eq(people.email, email)),
    )
    .limit(1);
  if (existingAuth || existingPerson) return;

  const hashed = await hashPassword(password);
  const accountId = randomUUID();

  const personId = await db.transaction(async (tx) => {
    await tx.insert(authUser).values({
      id: accountId,
      name,
      email,
      emailVerified: false,
    });
    await tx.insert(authAccount).values({
      id: randomUUID(),
      userId: accountId,
      accountId,
      providerId: "credential",
      password: hashed,
    });

    const [person] = await tx
      .insert(people)
      .values({ organizationId: ctx.organizationId, email, name, lifecycleStage })
      .returning({ id: people.id });

    await tx.insert(memberships).values({
      accountId,
      organizationId: ctx.organizationId,
      personId: person.id,
      communityId: null,
      roleId,
    });

    // Registo de consentimento (base legal: consentimento), auditável.
    await tx.insert(consents).values({
      organizationId: ctx.organizationId,
      personId: person.id,
      purpose: "data_processing",
      granted: consentProcessing,
      lawfulBasis: "consent",
      source: "admin",
    });
    return person.id;
  });

  // Trigger do motor de workflows (visitante -> seguimento, etc.). Defensivo.
  await dispatch(ctx.organizationId, "person.created", { personId, lifecycleStage });

  revalidatePath("/admin/members");
}

/**
 * GDPR — Direito ao esquecimento. Apaga DEFINITIVAMENTE uma pessoa do tenant e
 * os seus dados (consentimentos + memberships). A CONTA de login (global) NÃO é
 * apagada — pode pertencer a outros tenants. Exige confirmação pelo nome/email.
 */
export async function eraseMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgAdmin();
  const personId = String(formData.get("personId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!personId) return;

  const [person] = await db
    .select({ id: people.id, name: people.name, email: people.email })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.organizationId, ctx.organizationId)))
    .limit(1);
  if (!person) return;

  // Confirmação anti-acidente: tem de escrever o nome ou o email exato.
  if (confirm !== (person.name ?? "") && confirm !== (person.email ?? "")) return;

  await db.transaction(async (tx) => {
    await tx.delete(consents).where(eq(consents.personId, personId));
    await tx.delete(memberships).where(eq(memberships.personId, personId));
    await tx.delete(people).where(eq(people.id, personId));
  });

  revalidatePath("/admin/members");
}
