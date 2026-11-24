import { z } from "zod";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

const patch = z.object({ active: z.boolean().optional(), name: z.string().trim().min(2).max(80).optional(), weight: z.number().int().min(1).max(100).optional() });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireAdmin();
  return ok({ ad: await db.houseAd.update({ where: { id: (await params).id }, data: await body(req, patch) }) });
});

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireAdmin();
  await db.houseAd.delete({ where: { id: (await params).id } });
  return ok({ ok: true });
});
