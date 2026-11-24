import { z } from "zod";
import { APP_CATEGORIES, slugifySegment } from "@forjapp/shared";
import { route, body, ok, requireAdmin, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { parseConfig } from "@/lib/projects";
import type { Prisma } from "@prisma/client";

/** Create a template from an existing project. */
export const POST = route(async (req) => {
  await requireAdmin();
  const data = await body(req, z.object({ projectId: z.string(), name: z.string().trim().min(2).max(60), category: z.enum(APP_CATEGORIES.map((c) => c.id) as [string, ...string[]]), description: z.string().max(300).default("") }));
  const project = await db.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new ApiError(404, "Proyecto no encontrado");
  const config = parseConfig(project.config);
  const id = `${slugifySegment(data.name)}-${Date.now().toString(36)}`;
  const t = await db.template.create({ data: { id, name: data.name, category: data.category, description: data.description, accent: config.theme.primary, config: config as unknown as Prisma.InputJsonValue, sortOrder: 100 } });
  return ok({ template: t }, 201);
});
