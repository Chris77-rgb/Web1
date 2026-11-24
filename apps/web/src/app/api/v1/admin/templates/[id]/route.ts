import { z } from "zod";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const data = await body(req, z.object({ name: z.string().trim().min(2).max(60).optional(), description: z.string().max(300).optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }));
  const template = await db.template.update({ where: { id: (await params).id }, data });
  return ok({ template });
});

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireAdmin();
  await db.template.delete({ where: { id: (await params).id } });
  return ok({ ok: true });
});
