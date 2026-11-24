import { route, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireAdmin();
  await db.project.delete({ where: { id: (await params).id } });
  return ok({ ok: true });
});
