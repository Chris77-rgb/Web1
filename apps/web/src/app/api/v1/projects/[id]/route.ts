import { z } from "zod";
import { route, body, ok, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getOwnedProject, parseConfig } from "@/lib/projects";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  return ok({ project });
});

const patchSchema = z.object({
  config: z.unknown().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  /** Revision the client edited. If it doesn't match, someone else saved first → 409. */
  revision: z.number().int().optional(),
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  const data = await body(req, patchSchema);
  if (data.revision !== undefined && data.revision !== project.revision)
    throw new ApiError(409, "El proyecto se ha modificado en otra pestaña. Recarga para ver la última versión.", { revision: project.revision });

  const update: Prisma.ProjectUpdateInput = {};
  if (data.config !== undefined) {
    const config = parseConfig(data.config);
    const clash = await db.project.findFirst({ where: { userId: project.userId, packageName: config.meta.packageName, NOT: { id: project.id } } });
    if (clash) throw new ApiError(409, `Ya tienes otra app con el identificador ${config.meta.packageName}`);
    update.config = config as unknown as Prisma.InputJsonValue;
    update.name = config.meta.name;
    update.packageName = config.meta.packageName;
    update.revision = { increment: 1 };
  }
  if (data.status) {
    update.status = data.status;
    if (data.status === "PUBLISHED" && !project.publishedAt) update.publishedAt = new Date();
  }
  // Conditional update guards against a concurrent save between the read and the write.
  const res = await db.project.updateMany({ where: { id: project.id, revision: project.revision }, data: update as Prisma.ProjectUpdateManyMutationInput });
  if (res.count === 0) throw new ApiError(409, "Conflicto de guardado, vuelve a intentarlo.");
  const saved = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  return ok({ project: saved });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  await db.project.delete({ where: { id: project.id } });
  return ok({ ok: true });
});
