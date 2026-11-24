import { route, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const build = await db.build.findUnique({ where: { id: (await params).id }, include: { project: { select: { packageName: true } } } });
  if (!build || (build.userId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "Compilación no encontrada");
  if (build.status !== "SUCCESS" || !build.artifactKey) throw new ApiError(409, "El archivo todavía no está disponible");
  const { stream, size } = await storage.stream(build.artifactKey);
  await db.build.update({ where: { id: build.id }, data: { downloads: { increment: 1 } } });
  const ext = build.type === "AAB" ? "aab" : "apk";
  const filename = `${build.project.packageName}-v${build.versionName}-${build.versionCode}.${ext}`;
  return new Response(stream, {
    headers: {
      "Content-Type": build.type === "AAB" ? "application/octet-stream" : "application/vnd.android.package-archive",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
