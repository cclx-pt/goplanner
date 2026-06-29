import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { workflows, workflowRuns, tasks, people, messages } from "@/core/db/schema";

/**
 * Motor de workflows: trigger -> condição -> ação. Declarativo (sem código).
 * Tudo é tenant-scoped. `dispatch` NUNCA lança para quem o chama — falha de
 * automação não pode quebrar o fluxo de negócio.
 */
export interface WorkflowCondition {
  field: string;
  equals: unknown;
}
export type WorkflowAction =
  | { type: "create_task"; title: string }
  | { type: "set_field"; field: "lifecycleStage"; value: string }
  | { type: "send_message"; channel?: string; body: string }
  | { type: "log"; message: string };

export interface TriggerPayload {
  personId?: string;
  [key: string]: unknown;
}

async function record(
  orgId: string,
  workflowId: string,
  trigger: string,
  status: string,
  detail: string,
): Promise<void> {
  await db
    .insert(workflowRuns)
    .values({ organizationId: orgId, workflowId, trigger, status, detail });
}

/**
 * Dispara um trigger num tenant: corre os workflows ativos que lhe correspondem,
 * filtrando por condições e executando ações. Defensivo por design.
 */
export async function dispatch(
  orgId: string,
  trigger: string,
  payload: TriggerPayload,
): Promise<void> {
  try {
    const active = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.organizationId, orgId),
          eq(workflows.trigger, trigger),
          eq(workflows.active, true),
        ),
      );

    for (const wf of active) {
      const conds = (wf.conditions as WorkflowCondition[]) ?? [];
      const matches = conds.every((c) => payload[c.field] === c.equals);
      if (!matches) {
        await record(orgId, wf.id, trigger, "skipped", "condições não satisfeitas");
        continue;
      }

      const actions = (wf.actions as WorkflowAction[]) ?? [];
      const log: string[] = [];
      for (const a of actions) {
        if (a.type === "create_task") {
          await db.insert(tasks).values({
            organizationId: orgId,
            personId: payload.personId ?? null,
            title: a.title,
          });
          log.push(`tarefa: ${a.title}`);
        } else if (a.type === "set_field" && payload.personId) {
          await db
            .update(people)
            .set({ lifecycleStage: a.value })
            .where(eq(people.id, payload.personId));
          log.push(`lifecycle=${a.value}`);
        } else if (a.type === "send_message") {
          await db.insert(messages).values({
            organizationId: orgId,
            personId: payload.personId ?? null,
            channel: a.channel ?? "email",
            body: a.body,
          });
          log.push(`mensagem: ${a.channel ?? "email"}`);
        } else if (a.type === "log") {
          log.push(a.message);
        }
      }
      await record(orgId, wf.id, trigger, "matched", log.join("; ") || "sem ações");
    }
  } catch (e) {
    // Nunca propagar: automação não pode quebrar o negócio.
    console.error("workflow dispatch falhou:", e);
  }
}
