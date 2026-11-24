import Link from "next/link";
import { PlusCircle, Smartphone } from "lucide-react";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { ProjectCard } from "@/components/apps/project-card";

export const metadata = { title: "Mis aplicaciones" };

export default async function AppsPage() {
  const user = await requireUserPage();
  const projects = await db.project.findMany({
    where: { userId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    include: { builds: { orderBy: { queuedAt: "desc" }, take: 1, select: { status: true, type: true } }, _count: { select: { formSubmissions: { where: { read: false } } } } },
  });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Mis aplicaciones" description={`${projects.length} ${projects.length === 1 ? "aplicación" : "aplicaciones"}`} action={<Link href="/apps/new" className={buttonClass()}><PlusCircle className="size-4" />Crear aplicación</Link>} />
      {projects.length === 0 ? (
        <Card><EmptyState icon={<Smartphone className="size-6" />} title="Crea tu primera app" text="Elige una plantilla o describe tu idea y la IA preparará la estructura por ti." action={<Link href="/apps/new" className={buttonClass()}>Empezar</Link>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const c = p.config as { theme?: { primary?: string; secondary?: string }; branding?: { iconUrl?: string }; pages?: unknown[] };
            return (
              <ProjectCard
                key={p.id}
                project={{
                  id: p.id, name: p.name, packageName: p.packageName, status: p.status, updatedAt: p.updatedAt.toISOString(),
                  primary: c.theme?.primary ?? "#6D28D9", secondary: c.theme?.secondary ?? "#F59E0B", iconUrl: c.branding?.iconUrl ?? null, slug: p.slug,
                  pages: c.pages?.length ?? 0, lastBuild: p.builds[0] ?? null, unread: p._count.formSubmissions,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
