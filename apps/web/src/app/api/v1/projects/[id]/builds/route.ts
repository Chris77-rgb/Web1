import { z } from "zod";
import { MODULE_MAP, planAllows, type PlanCode } from "@forjapp/shared";
import { route, body, ok, requireUser, requireVerifiedUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { assertCanBuild } from "@/lib/limits";
import { getOwnedProject, parseConfig } from "@/lib/projects";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  const builds = await db.build.findMany({
    where: { projectId: project.id },
    orderBy: { queuedAt: "desc" },
    take: 50,
    select: { id: true, type: true, status: true, versionCode: true, versionName: true, error: true, artifactSize: true, downloads: true, queuedAt: true, startedAt: true, finishedAt: true },
  });
  return ok({ builds });
});

const createSchema = z.object({
  type: z.enum(["APK", "AAB"]).default("APK"),
  /** Auto-increment versionCode if it was already used by a successful build. */
  bumpVersion: z.boolean().default(true),
});

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireVerifiedUser();
  const project = await getOwnedProject((await params).id, user);
  const { type, bumpVersion } = await body(req, createSchema);
  const plan = await assertCanBuild(user.id, user.planCode, type);

  const active = await db.build.count({ where: { projectId: project.id, status: { in: ["QUEUED", "RUNNING"] } } });
  if (active) throw new ApiError(409, "Ya hay una compilación en curso para esta app.");

  const config = parseConfig(project.config);
  const blocked = config.pages.flatMap((p) => p.blocks).filter((b) => !planAllows(plan.code as PlanCode, MODULE_MAP[b.type]?.minPlan));
  if (blocked.length) {
    const names = [...new Set(blocked.map((b) => MODULE_MAP[b.type]?.label ?? b.type))].join(", ");
    throw new ApiError(402, `Tu plan no incluye estos módulos: ${names}`);
  }
  if (config.integrations.push.enabled && !plan.features.includes("push_notifications"))
    throw new ApiError(402, "Las notificaciones push no están incluidas en tu plan.");

  const lastOk = await db.build.findFirst({ where: { projectId: project.id, status: "SUCCESS" }, orderBy: { versionCode: "desc" } });
  let configChanged = false;
  if (bumpVersion && lastOk && lastOk.versionCode >= config.meta.versionCode) {
    config.meta.versionCode = lastOk.versionCode + 1;
    configChanged = true;
  }

  const build = await db.$transaction(async (tx) => {
    if (configChanged)
      await tx.project.update({ where: { id: project.id }, data: { config: config as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
    return tx.build.create({
      data: {
        projectId: project.id,
        userId: project.userId,
        type,
        priority: plan.features.includes("priority_builds") ? 10 : 0,
        versionCode: config.meta.versionCode,
        versionName: config.meta.versionName,
        configSnapshot: config as unknown as Prisma.InputJsonValue,
        log: `[${new Date().toISOString()}] Compilación ${type} en cola (v${config.meta.versionName} · código ${config.meta.versionCode})\n`,
      },
    });
  });
  return ok({ build: { id: build.id, status: build.status, type: build.type, versionCode: build.versionCode }, versionBumped: configChanged }, 201);
});
