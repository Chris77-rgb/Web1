import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Inbox, Users, Bell } from "lucide-react";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Stat } from "@/components/stat";
import { MarkRead } from "@/components/apps/mark-read";
import { timeAgo } from "@/components/status";

export const metadata = { title: "Datos de la app" };

export default async function DataPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const project = await db.project.findUnique({ where: { id: (await params).id } });
  if (!project || (project.userId !== user.id && user.role !== "ADMIN")) notFound();
  const [subs, appUsers, devices] = await Promise.all([
    db.formSubmission.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.appUser.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, createdAt: true } }),
    db.pushDevice.count({ where: { projectId: project.id } }),
  ]);
  const unread = subs.filter((s) => !s.read).map((s) => s.id);

  return (
    <div className="animate-fade-in">
      <Link href="/apps" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" />Mis aplicaciones</Link>
      <PageHeader title={`Datos de ${project.name}`} description="Respuestas de formularios, usuarios registrados y dispositivos suscritos." action={unread.length ? <MarkRead projectId={project.id} ids={unread} /> : undefined} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Respuestas de formularios" value={subs.length} hint={`${unread.length} sin leer`} icon={<Inbox className="size-5" />} />
        <Stat label="Usuarios de la app" value={appUsers.length} icon={<Users className="size-5" />} />
        <Stat label="Dispositivos con push" value={devices} icon={<Bell className="size-5" />} />
      </div>
      <Card className="mb-6">
        <CardHeader title="Respuestas de formularios" />
        {subs.length === 0 ? (
          <EmptyState icon={<Inbox className="size-6" />} title="Sin respuestas todavía" text="Cuando alguien envíe un formulario desde tu app (o desde la vista previa) aparecerá aquí." />
        ) : (
          <ul className="divide-y divide-line">
            {subs.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  {!s.read && <span className="size-2 rounded-full bg-brand-600" aria-label="No leído" />}
                  <span className="font-medium">{s.formTitle || "Formulario"}</span>
                  <span className="text-muted">· {timeAgo(s.createdAt)}</span>
                  {s.source === "preview" && <span className="rounded bg-card-2 px-1.5 text-xs text-muted">vista previa</span>}
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[180px_1fr]">
                  {Object.entries(s.data as Record<string, string>).map(([k, v]) => (
                    <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="whitespace-pre-wrap break-words">{v || "—"}</dd></div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="Usuarios registrados en la app" />
        {appUsers.length === 0 ? (
          <EmptyState icon={<Users className="size-6" />} title="Sin usuarios" text="Añade el módulo «Usuarios» a tu app para que la gente pueda registrarse." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-muted"><tr><th className="px-5 py-2 font-medium">Nombre</th><th className="px-5 py-2 font-medium">Email</th><th className="px-5 py-2 font-medium">Alta</th></tr></thead>
            <tbody className="divide-y divide-line">{appUsers.map((u) => <tr key={u.id}><td className="px-5 py-2.5">{u.name}</td><td className="px-5 py-2.5">{u.email}</td><td className="px-5 py-2.5 text-muted">{timeAgo(u.createdAt)}</td></tr>)}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
