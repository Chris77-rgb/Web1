import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/card";
import { AdminAction } from "@/components/admin/action";
import { BuildStatusBadge, timeAgo, formatBytes } from "@/components/status";

export const metadata = { title: "Compilaciones · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBuilds() {
  const builds = await db.build.findMany({
    orderBy: [{ queuedAt: "desc" }],
    take: 100,
    include: { project: { select: { name: true } }, user: { select: { email: true } } },
  });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Compilaciones" description="Cola y últimas 100 compilaciones de la plataforma." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-muted"><tr>{["App", "Tipo", "Estado", "Worker", "Tamaño", "En cola", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {builds.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3"><Link href={`/apps/${b.projectId}/builds`} className="font-medium hover:underline">{b.project.name}</Link><p className="text-xs text-muted">{b.user.email}</p></td>
                <td className="px-4 py-3">{b.type} v{b.versionName} ({b.versionCode}){b.priority > 0 && <span className="ml-1 text-xs text-amber-600">prioritaria</span>}</td>
                <td className="px-4 py-3"><BuildStatusBadge status={b.status} />{b.error && <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={b.error}>{b.error}</p>}</td>
                <td className="px-4 py-3 text-xs text-muted">{b.workerId ?? "—"}</td>
                <td className="px-4 py-3">{b.artifactSize ? formatBytes(b.artifactSize) : "—"}</td>
                <td className="px-4 py-3 text-muted">{timeAgo(b.queuedAt)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                  {["FAILED", "CANCELED"].includes(b.status) && <AdminAction url={`/api/v1/admin/builds/${b.id}/retry`} success="Reencolada">Reintentar</AdminAction>}
                  {["QUEUED", "RUNNING"].includes(b.status) && <AdminAction url={`/api/v1/builds/${b.id}/cancel`} variant="danger" success="Cancelada">Cancelar</AdminAction>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
