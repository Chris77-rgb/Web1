import Link from "next/link";
import { Smartphone, Rocket, PencilRuler, Download, PlusCircle, Inbox, ArrowRight, Sparkles } from "lucide-react";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlan, getUsage } from "@/lib/limits";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Stat, UsageBar } from "@/components/stat";
import { DailyBars } from "@/components/dashboard/bar-chart";
import { BuildStatusBadge, ProjectStatusBadge, timeAgo, formatBytes } from "@/components/status";

export const metadata = { title: "Panel" };

export default async function Dashboard() {
  const user = await requireUserPage();
  const since = new Date(Date.now() - 13 * 86400_000);
  since.setHours(0, 0, 0, 0);

  const [plan, usage, byStatus, recentProjects, recentBuilds, downloads, unread, buildsRange] = await Promise.all([
    getPlan(user.planCode),
    getUsage(user.id),
    db.project.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
    db.project.findMany({ where: { userId: user.id, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, status: true, updatedAt: true, packageName: true } }),
    db.build.findMany({ where: { userId: user.id }, orderBy: { queuedAt: "desc" }, take: 6, include: { project: { select: { name: true } } } }),
    db.build.aggregate({ where: { userId: user.id }, _sum: { downloads: true } }),
    db.formSubmission.count({ where: { project: { userId: user.id }, read: false } }),
    db.build.findMany({ where: { userId: user.id, queuedAt: { gte: since } }, select: { queuedAt: true } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const total = count("DRAFT") + count("PUBLISHED");

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, day: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }), value: 0 };
  });
  for (const b of buildsRange) {
    const k = b.queuedAt.toISOString().slice(0, 10);
    const d = days.find((x) => x.key === k);
    if (d) d.value++;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted">Este es el estado de tus aplicaciones.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/apps/new?ai=1" className={buttonClass("outline")}><Sparkles className="size-4" />Crear con IA</Link>
          <Link href="/apps/new" className={buttonClass("primary")}><PlusCircle className="size-4" />Crear aplicación</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aplicaciones creadas" value={total} icon={<Smartphone className="size-5" />} hint={`${usage.projects} de ${plan.maxProjects < 0 ? "∞" : plan.maxProjects} en tu plan`} />
        <Stat label="Publicadas" value={count("PUBLISHED")} icon={<Rocket className="size-5" />} />
        <Stat label="En desarrollo" value={count("DRAFT")} icon={<PencilRuler className="size-5" />} />
        <Stat label="Descargas de archivos" value={downloads._sum.downloads ?? 0} icon={<Download className="size-5" />} hint={unread ? <Link href="/apps" className="text-brand-600 dark:text-brand-300">{unread} respuestas de formularios sin leer</Link> : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Compilaciones" description="Últimos 14 días" />
          <div className="p-5"><DailyBars data={days} label="Compilaciones por día en los últimos 14 días" /></div>
        </Card>
        <Card>
          <CardHeader title={`Plan ${plan.name}`} description="Uso de este mes" action={<Link href="/billing" className="text-sm font-medium text-brand-600 dark:text-brand-300">Mejorar</Link>} />
          <div className="flex flex-col gap-4 p-5">
            <UsageBar label="Proyectos" used={usage.projects} limit={plan.maxProjects} />
            <UsageBar label="Compilaciones" used={usage.buildsThisMonth} limit={plan.maxBuildsPerMonth} />
            <UsageBar label="Almacenamiento" used={usage.storageBytes} limit={plan.maxStorageMb < 0 ? -1 : plan.maxStorageMb * 1024 * 1024} format={formatBytes} />
            <UsageBar label="Peticiones de IA" used={usage.aiThisMonth} limit={plan.maxAiRequestsPerMonth} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Últimas modificaciones" action={<Link href="/apps" className="text-sm text-muted hover:text-fg">Ver todas</Link>} />
          {recentProjects.length === 0 ? (
            <EmptyState icon={<Smartphone className="size-6" />} title="Aún no tienes apps" text="Crea tu primera aplicación desde una plantilla o describiéndola con IA." action={<Link href="/apps/new" className={buttonClass()}>Crear aplicación</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {recentProjects.map((p) => (
                <li key={p.id}>
                  <Link href={`/apps/${p.id}/editor`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-card-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted">{p.packageName} · {timeAgo(p.updatedAt)}</p>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                    <ArrowRight className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Estado de las compilaciones" />
          {recentBuilds.length === 0 ? (
            <EmptyState icon={<Inbox className="size-6" />} title="Sin compilaciones" text="Cuando generes un APK o AAB aparecerá aquí." />
          ) : (
            <ul className="divide-y divide-line">
              {recentBuilds.map((b) => (
                <li key={b.id}>
                  <Link href={`/apps/${b.projectId}/builds`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-card-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.project.name} <span className="text-xs font-normal text-muted">· {b.type} v{b.versionName}</span></p>
                      <p className="text-xs text-muted">{timeAgo(b.queuedAt)}</p>
                    </div>
                    <BuildStatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
