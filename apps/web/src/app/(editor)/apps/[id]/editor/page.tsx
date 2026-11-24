import { notFound } from "next/navigation";
import { validateAppConfig, type PlanCode } from "@forjapp/shared";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Editor } from "@/components/editor/editor";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editor" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const project = await db.project.findUnique({ where: { id: (await params).id } });
  if (!project || (project.userId !== user.id && user.role !== "ADMIN")) notFound();
  const v = validateAppConfig(project.config);
  if (!v.ok) {
    return <div className="p-10 text-center"><h1 className="text-xl font-bold">La configuración de esta app está dañada</h1><pre className="mt-4 text-left text-xs">{v.errors.join("\n")}</pre></div>;
  }
  const { adSharePercent } = await getSettings();
  return (
    <Editor
      project={{
        id: project.id, revision: project.revision, config: v.config, status: project.status,
        slug: project.slug, publishedRevision: project.publishedRevision, adfreeUntil: project.adfreeUntil?.toISOString() ?? null,
      }}
      planCode={user.planCode as PlanCode}
      sharePercent={adSharePercent}
    />
  );
}
