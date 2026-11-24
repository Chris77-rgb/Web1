import { route, ok, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const build = await db.build.findUnique({ where: { id: (await params).id } });
  if (!build || (build.userId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "Compilación no encontrada");
  // RUNNING builds are flagged; the worker checks the status and aborts Gradle.
  const res = await db.build.updateMany({
    where: { id: build.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELED", finishedAt: new Date(), error: "Cancelada por el usuario" },
  });
  if (!res.count) throw new ApiError(409, "La compilación ya ha terminado");
  return ok({ ok: true });
});
