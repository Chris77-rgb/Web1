import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/limits";
import { BuildsView } from "@/components/builds/builds-view";

export const metadata = { title: "Compilaciones" };

export default async function BuildsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const project = await db.project.findUnique({ where: { id: (await params).id } });
  if (!project || (project.userId !== user.id && user.role !== "ADMIN")) notFound();
  const plan = await getPlan(user.planCode);
  const c = project.config as { meta: { versionName: string; versionCode: number; packageName: string }; theme: { primary: string } };
  return (
    <BuildsView
      project={{ id: project.id, name: project.name, packageName: c.meta.packageName, versionName: c.meta.versionName, versionCode: c.meta.versionCode, primary: c.theme.primary }}
      canAab={plan.features.includes("aab_builds")}
      verified={!!user.emailVerifiedAt}
    />
  );
}
