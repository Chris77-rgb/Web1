import { z } from "zod";
import { route, body, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

/** Grants (or removes) the per-app Adfree service. `days` extends from today or from the current expiry. */
export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const { days } = await body(req, z.object({ days: z.number().int().min(0).max(3650) }));
  const id = (await params).id;
  const project = await db.project.findUniqueOrThrow({ where: { id }, select: { adfreeUntil: true } });
  const from = project.adfreeUntil && project.adfreeUntil > new Date() ? project.adfreeUntil : new Date();
  const adfreeUntil = days === 0 ? null : new Date(from.getTime() + days * 86400_000);
  await db.project.update({ where: { id }, data: { adfreeUntil } });
  return ok({ adfreeUntil });
});
