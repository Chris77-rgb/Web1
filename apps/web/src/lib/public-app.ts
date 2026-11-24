import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./api";
import { env } from "./env";

/** Public endpoints only accept projects that exist and aren't archived. */
export async function getPublicProject(projectId: string) {
  if (!/^[a-z0-9]{10,40}$/i.test(projectId)) throw new ApiError(404, "App no encontrada");
  const p = await db.project.findUnique({ where: { id: projectId }, select: { id: true, status: true, config: true, user: { select: { planCode: true } } } });
  if (!p || p.status === "ARCHIVED") throw new ApiError(404, "App no encontrada");
  return p;
}

export function appUserToken(appUserId: string): string {
  const sig = createHmac("sha256", env.encryptionKey).update(`appuser:${appUserId}`).digest("base64url");
  return `${appUserId}.${sig}`;
}
