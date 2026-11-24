/** Plan limits & usage. Every quota check in the API goes through here. */
import "server-only";
import type { Plan } from "@prisma/client";
import { withinLimit, type PlanFeature } from "@forjapp/shared";
import { db } from "./db";
import { ApiError } from "./api";

export async function getPlan(planCode: string): Promise<Plan> {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw new ApiError(500, `Plan ${planCode} no encontrado. ¿Has ejecutado el seed?`);
  return plan;
}

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export async function getUsage(userId: string) {
  const since = monthStart();
  const [projects, builds, storage, ai] = await Promise.all([
    db.project.count({ where: { userId, status: { not: "ARCHIVED" } } }),
    db.build.count({ where: { userId, queuedAt: { gte: since } } }),
    db.asset.aggregate({ where: { userId }, _sum: { size: true } }),
    db.aiRequest.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  return { projects, buildsThisMonth: builds, storageBytes: storage._sum.size ?? 0, aiThisMonth: ai };
}

export async function assertCanCreateProject(userId: string, planCode: string) {
  const [plan, usage] = await Promise.all([getPlan(planCode), getUsage(userId)]);
  if (!withinLimit(usage.projects, plan.maxProjects))
    throw new ApiError(402, `Tu plan ${plan.name} permite ${plan.maxProjects} proyectos. Mejora tu plan para crear más.`);
}

export async function assertCanBuild(userId: string, planCode: string, type: "APK" | "AAB") {
  const [plan, usage] = await Promise.all([getPlan(planCode), getUsage(userId)]);
  if (type === "AAB" && !plan.features.includes("aab_builds")) throw new ApiError(402, `Los paquetes AAB no están incluidos en el plan ${plan.name}.`);
  if (!withinLimit(usage.buildsThisMonth, plan.maxBuildsPerMonth))
    throw new ApiError(402, `Has alcanzado el límite de ${plan.maxBuildsPerMonth} compilaciones este mes.`);
  return plan;
}

export async function assertStorage(userId: string, planCode: string, incoming: number) {
  const [plan, usage] = await Promise.all([getPlan(planCode), getUsage(userId)]);
  if (plan.maxStorageMb >= 0 && usage.storageBytes + incoming > plan.maxStorageMb * 1024 * 1024)
    throw new ApiError(402, `Has superado el almacenamiento de tu plan (${plan.maxStorageMb} MB).`);
}

/** Feature check only: used when the user brings their own AI key (no platform quota applies). */
export async function assertAiFeature(planCode: string) {
  const plan = await getPlan(planCode);
  if (!plan.features.includes("ai_assistant")) throw new ApiError(402, "El asistente de IA no está incluido en tu plan.");
}

export async function assertAi(userId: string, planCode: string) {
  const [plan, usage] = await Promise.all([getPlan(planCode), getUsage(userId)]);
  if (!plan.features.includes("ai_assistant")) throw new ApiError(402, "El asistente de IA no está incluido en tu plan.");
  if (!withinLimit(usage.aiThisMonth, plan.maxAiRequestsPerMonth))
    throw new ApiError(402, `Has usado las ${plan.maxAiRequestsPerMonth} peticiones de IA de este mes.`);
}

export async function hasFeature(planCode: string, f: PlanFeature) {
  return (await getPlan(planCode)).features.includes(f);
}
