import { route, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { assertCanCreateProject } from "@/lib/limits";
import { getOwnedProject, parseConfig, uniquePackageName } from "@/lib/projects";
import type { Prisma } from "@prisma/client";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const src = await getOwnedProject((await params).id, user);
  await assertCanCreateProject(user.id, user.planCode);
  const cfg = parseConfig(src.config);
  cfg.meta.name = `${cfg.meta.name} (copia)`.slice(0, 50);
  cfg.meta.packageName = await uniquePackageName(user.id, cfg.meta.name, `${src.packageName}copy`);
  cfg.meta.versionCode = 1;
  const project = await db.project.create({
    data: { userId: user.id, name: cfg.meta.name, packageName: cfg.meta.packageName, category: src.category, templateId: src.templateId, config: cfg as unknown as Prisma.InputJsonValue },
  });
  return ok({ project }, 201);
});
