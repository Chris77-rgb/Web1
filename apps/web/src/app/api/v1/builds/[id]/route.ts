import { route, ok, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const build = await db.build.findUnique({
    where: { id: (await params).id },
    select: { id: true, projectId: true, userId: true, type: true, status: true, versionCode: true, versionName: true, log: true, error: true, artifactSize: true, downloads: true, queuedAt: true, startedAt: true, finishedAt: true },
  });
  if (!build || (build.userId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "Compilación no encontrada");
  const position =
    build.status === "QUEUED" ? await db.build.count({ where: { status: "QUEUED", OR: [{ priority: { gt: 0 } }, { queuedAt: { lt: build.queuedAt } }] } }) : 0;
  return ok({ build: { ...build, queuePosition: position } });
});
