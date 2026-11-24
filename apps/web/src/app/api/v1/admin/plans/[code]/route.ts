import { z } from "zod";
import { PLAN_FEATURES } from "@forjapp/shared";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

const limit = z.number().int().min(-1).max(1_000_000);
const schema = z.object({
  name: z.string().trim().min(1).max(40),
  description: z.string().max(200),
  priceMonthlyCents: z.number().int().min(0).max(10_000_000),
  maxProjects: limit,
  maxBuildsPerMonth: limit,
  maxStorageMb: limit,
  maxAiRequestsPerMonth: limit,
  features: z.array(z.enum(PLAN_FEATURES)),
  stripePriceId: z.string().trim().max(100).nullable(),
  active: z.boolean(),
});

export const PUT = route<{ params: Promise<{ code: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const data = await body(req, schema);
  const plan = await db.plan.update({ where: { code: (await params).code }, data: { ...data, stripePriceId: data.stripePriceId || null } });
  return ok({ plan });
});
