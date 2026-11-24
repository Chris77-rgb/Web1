import { route, ok, requireAdmin, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

/** Re-queues a failed/canceled build with the same config snapshot. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  await requireAdmin();
  const res = await db.build.updateMany({
    where: { id: (await params).id, status: { in: ["FAILED", "CANCELED"] } },
    data: { status: "QUEUED", error: null, startedAt: null, finishedAt: null, workerId: null, queuedAt: new Date(), log: "Reencolada por un administrador\n" },
  });
  if (!res.count) throw new ApiError(409, "Solo se pueden reintentar compilaciones fallidas o canceladas");
  return ok({ ok: true });
});
