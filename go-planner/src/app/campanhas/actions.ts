"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/core/db";
import { campaigns, objectives } from "@/core/db/schema";
import { fromMajor } from "@/core/money";
import { getAccessState, canHere } from "@/core/access/context";

async function ctx() { const s = await getAccessState(); if (s.status !== "ok") return null; if (!(await canHere(s.ctx, "campanhas.campanha.gerir", "campanhas"))) return null; return s.ctx; }

export async function createCampaignAction(f: FormData): Promise<void> {
  const c = await ctx(); if (!c) return;
  const name = String(f.get("name") ?? "").trim(); const fundId = String(f.get("fundId") ?? "");
  const amount = parseFloat(String(f.get("target") ?? "").replace(",", ".")); const cur = String(f.get("currency") ?? "EUR");
  if (!name || !fundId || !Number.isFinite(amount) || amount <= 0) return;
  await db.insert(campaigns).values({ organizationId: c.organizationId, name, fundId, targetMinor: fromMajor(amount, cur).minor, currency: cur, type: f.get("recurring") ? "recurring" : "one_time", scope: String(f.get("scope") ?? "org") });
  revalidatePath("/campanhas");
}

export async function createObjectiveAction(f: FormData): Promise<void> {
  const c = await ctx(); if (!c) return;
  const fundId = String(f.get("fundId") ?? ""); const month = String(f.get("month") ?? "").trim();
  const amount = parseFloat(String(f.get("target") ?? "").replace(",", ".")); const cur = String(f.get("currency") ?? "EUR");
  if (!fundId || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(amount) || amount <= 0) return;
  await db.insert(objectives).values({ organizationId: c.organizationId, fundId, month, targetMinor: fromMajor(amount, cur).minor, currency: cur });
  revalidatePath("/campanhas");
}
