import { Prisma } from "@prisma/client";
import { route, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getOwnedProject, parseConfig, uniqueSlug } from "@/lib/projects";

type Ctx = { params: Promise<{ id: string }> };

/** Publishes (or republishes) the current config as a public web page at /s/<slug>. */
export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  const config = parseConfig(project.config);
  const slug = project.slug ?? (await uniqueSlug(config.meta.name));
  await db.project.update({
    where: { id: project.id },
    data: {
      slug,
      status: "PUBLISHED",
      publishedConfig: config as unknown as Prisma.InputJsonValue,
      publishedRevision: project.revision,
      publishedAt: project.publishedAt ?? new Date(),
    },
  });
  return ok({ slug, url: `${env.appUrl}/s/${slug}`, revision: project.revision });
});

/** Takes the page offline. The slug is kept so republishing restores the same address. */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const project = await getOwnedProject((await params).id, user);
  await db.project.update({ where: { id: project.id }, data: { status: "DRAFT", publishedConfig: Prisma.DbNull, publishedRevision: null } });
  return ok({ ok: true });
});
