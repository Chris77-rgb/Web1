import "server-only";
import type { Project } from "@prisma/client";
import { validateAppConfig, suggestPackageName, type AppConfig } from "@forjapp/shared";
import { db } from "./db";
import { ApiError } from "./api";
import type { SafeUser } from "./auth";

/** Loads a project the user may access (owner, or any project for admins). 404 otherwise. */
export async function getOwnedProject(id: string, user: SafeUser): Promise<Project> {
  const p = await db.project.findUnique({ where: { id } });
  if (!p || (p.userId !== user.id && user.role !== "ADMIN")) throw new ApiError(404, "Proyecto no encontrado");
  return p;
}

export function parseConfig(input: unknown): AppConfig {
  const r = validateAppConfig(input);
  if (!r.ok) throw new ApiError(422, "La configuración de la app no es válida", r.errors);
  return r.config;
}

/** Returns a package name not used by any other of the user's projects. */
export async function uniquePackageName(userId: string, appName: string, base?: string): Promise<string> {
  const root = base ?? suggestPackageName(appName, "forjapp");
  let candidate = root;
  for (let i = 2; await db.project.findFirst({ where: { userId, packageName: candidate } }); i++) candidate = `${root}${i}`;
  return candidate;
}
