import { z } from "zod";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({
  siteName: z.string().trim().min(1).max(60),
  registrationOpen: z.boolean(),
  maintenanceMessage: z.string().max(300),
  supportEmail: z.string().email().max(200).or(z.literal("")),
});

export const PUT = route(async (req) => {
  await requireAdmin();
  const data = await body(req, schema);
  await db.$transaction(Object.entries(data).map(([key, value]) => db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })));
  return ok({ ok: true });
});
