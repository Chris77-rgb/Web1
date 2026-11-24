import Link from "next/link";
import { Users, Smartphone, Hammer, Download, Clock, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/stat";
import { DailyBars } from "@/components/dashboard/bar-chart";
import { BuildStatusBadge, timeAgo } from "@/components/status";

export const metadata = { title: "Administración" };

export default async function AdminHome() {
  const since = new Date(Date.now() - 29 * 86400_000);
  since.setHours(0, 0, 0, 0);
  const [users, verified, projects, published, builds, queue, downloads, signups, failures, byPlan] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.project.count(),
    db.project.count({ where: { status: "PUBLISHED" } }),
    db.build.groupBy({ by: ["status"], _count: true }),
    db.build.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    db.build.aggregate({ _sum: { downloads: true } }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.build.findMany({ where: { status: "FAILED" }, orderBy: { finishedAt: "desc" }, take: 5, include: { project: { select: { name: true } } } }),
    db.user.groupBy({ by: ["planCode"], _count: true }),
  ]);
  const bc = (s: string) => builds.find((b) => b.status === s)?._count ?? 0;
  const done = bc("SUCCESS") + bc("FAILED");
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    return { key: d.toISOString().slice(0, 10), day: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }), value: 0 };
  });
  for (const s of signups) {
    const d = days.find((x) => x.key === s.createdAt.toISOString().slice(0, 10));
    if (d) d.value++;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Administración" description="Estado global de la plataforma." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Usuarios" value={users} hint={`${verified} verificados`} icon={<Users className="size-5" />} />
        <Stat label="Aplicaciones" value={projects} hint={`${published} publicadas`} icon={<Smartphone className="size-5" />} />
        <Stat label="Compilaciones correctas" value={bc("SUCCESS")} hint={done ? `${Math.round((bc("SUCCESS") / done) * 100)}% de éxito` : undefined} icon={<Hammer className="size-5" />} />
        <Stat label="En cola / compilando" value={queue} icon={<Clock className="size-5" />} hint={<Link href="/admin/builds" className="text-brand-600 dark:text-brand-300">Ver cola</Link>} />
        <Stat label="Descargas" value={downloads._sum.downloads ?? 0} icon={<Download className="size-5" />} />
        <Stat label="Fallidas" value={bc("FAILED")} icon={<AlertTriangle className="size-5" />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Registros" description="Últimos 30 días" />
          <div className="p-5"><DailyBars data={days} label="Nuevos usuarios por día" /></div>
        </Card>
        <Card>
          <CardHeader title="Usuarios por plan" />
          <ul className="divide-y divide-line">{byPlan.map((p) => <li key={p.planCode} className="flex justify-between px-5 py-3 text-sm"><span>{p.planCode}</span><span className="font-semibold">{p._count}</span></li>)}</ul>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Últimos fallos de compilación" />
        {failures.length === 0 ? <p className="p-5 text-sm text-muted">Sin fallos recientes 🎉</p> : (
          <ul className="divide-y divide-line">{failures.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="font-medium">{b.project.name} · {b.type}</p><p className="truncate text-xs text-muted">{b.error}</p></div>
              <span className="text-xs text-muted">{b.finishedAt ? timeAgo(b.finishedAt) : ""}</span>
              <BuildStatusBadge status={b.status} />
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}
