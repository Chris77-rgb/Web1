import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/card";
import { AdminAction } from "@/components/admin/action";
import { ProjectStatusBadge, timeAgo } from "@/components/status";
import { TemplateFromProject } from "@/components/admin/template-from-project";

export const metadata = { title: "Proyectos · Admin" };

export default async function AdminProjects({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const projects = await db.project.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { packageName: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] } : {},
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } }, _count: { select: { builds: true, formSubmissions: true } } },
  });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Proyectos" description="Últimos 100 proyectos modificados." />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Buscar por nombre, paquete o email…" className="w-full max-w-sm rounded-xl border border-line bg-card px-3 py-2 text-sm" /></form>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-muted"><tr>{["App", "Propietario", "Estado", "Adfree", "Builds", "Formularios", "Modificada", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3"><Link href={`/apps/${p.id}/editor`} className="font-medium hover:underline">{p.name}</Link><p className="text-xs text-muted">{p.packageName}</p></td>
                <td className="px-4 py-3 text-muted">{p.user.email}</td>
                <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-xs">{p.adfreeUntil && p.adfreeUntil > new Date() ? <span className="text-emerald-600">hasta {p.adfreeUntil.toLocaleDateString("es-ES")}</span> : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">{p._count.builds}</td>
                <td className="px-4 py-3">{p._count.formSubmissions}</td>
                <td className="px-4 py-3 text-muted">{timeAgo(p.updatedAt)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                  <AdminAction url={`/api/v1/admin/projects/${p.id}/adfree`} method="PUT" payload={{ days: 30 }} success="Adfree +30 días">Adfree +30d</AdminAction>
                  {p.adfreeUntil && p.adfreeUntil > new Date() && <AdminAction url={`/api/v1/admin/projects/${p.id}/adfree`} method="PUT" payload={{ days: 0 }} success="Adfree desactivado">Quitar Adfree</AdminAction>}
                  <TemplateFromProject projectId={p.id} defaultName={p.name} />
                  <AdminAction url={`/api/v1/admin/projects/${p.id}`} method="DELETE" variant="danger" confirmText={`¿Eliminar «${p.name}»?`} success="Proyecto eliminado">Eliminar</AdminAction>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
