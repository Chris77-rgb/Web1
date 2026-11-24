import { z } from "zod";
import { route, body, ok, withCors, corsPreflight, rateLimit, ipOf } from "@/lib/api";
import { db } from "@/lib/db";
import { getPublicProject } from "@/lib/public-app";

export const POST = route<{ params: Promise<{ projectId: string }> }>(async (req, { params }) => {
  rateLimit(`push:${ipOf(req)}`, 20, 10 * 60_000);
  const project = await getPublicProject((await params).projectId);
  const { token, platform } = await body(req, z.object({ token: z.string().min(10).max(4096), platform: z.string().max(20).default("android") }));
  await db.pushDevice.upsert({ where: { projectId_token: { projectId: project.id, token } }, create: { projectId: project.id, token, platform }, update: {} });
  return withCors(ok({ ok: true }, 201));
});
export const OPTIONS = corsPreflight;
