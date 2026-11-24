import { z } from "zod";
import { route, ok, body, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  const [submissions, appUsers, pushDevices] = await Promise.all([
    db.formSubmission.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.appUser.count({ where: { projectId: project.id } }),
    db.pushDevice.count({ where: { projectId: project.id } }),
  ]);
  return ok({ submissions, appUsers, pushDevices });
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(500) }));
  await db.formSubmission.updateMany({ where: { projectId: project.id, id: { in: ids } }, data: { read: true } });
  return ok({ ok: true });
});
