import { z } from "zod";
import { route, body, ok, withCors, corsPreflight, rateLimit, ipOf } from "@/lib/api";
import { db } from "@/lib/db";
import { getPublicProject } from "@/lib/public-app";

const schema = z.object({
  blockId: z.string().max(64),
  formTitle: z.string().max(200).default(""),
  data: z.record(z.string().max(200), z.string().max(5000)).refine((d) => Object.keys(d).length <= 30, "Demasiados campos"),
  source: z.enum(["app", "preview", "web"]).default("app"),
});

export const POST = route<{ params: Promise<{ projectId: string }> }>(async (req, { params }) => {
  const ip = ipOf(req);
  rateLimit(`form:${ip}`, 20, 10 * 60_000);
  const project = await getPublicProject((await params).projectId);
  const data = await body(req, schema);
  await db.formSubmission.create({ data: { projectId: project.id, blockId: data.blockId, formTitle: data.formTitle, data: data.data, source: data.source, ip } });
  return withCors(ok({ ok: true }, 201));
});
export const OPTIONS = corsPreflight;
