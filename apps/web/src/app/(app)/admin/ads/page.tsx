import { db } from "@/lib/db";
import { getAdShare } from "@/lib/ads";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/card";
import { AdminAction } from "@/components/admin/action";
import { NewAdForm } from "@/components/admin/new-ad-form";

export const metadata = { title: "Anuncios · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAds() {
  const [ads, share, today] = await Promise.all([
    db.houseAd.findMany({ orderBy: { createdAt: "desc" } }),
    getAdShare(),
    db.adDayCounter.aggregate({ where: { day: new Date().toISOString().slice(0, 10) }, _sum: { impressions: true, clicks: true } }),
  ]);
  const pct = (c: number, i: number) => (i ? `${((c / i) * 100).toFixed(1)} %` : "—");
  return (
    <div className="animate-fade-in">
      <PageHeader title="Anuncios de Forjapp" description={`Se muestran en las páginas publicadas: al 100 % de los visitantes si el creador no pone anuncio propio, y al ${share} % si lo pone (ajustable en Configuración). Sin ningún anuncio activo se muestra una promoción de Forjapp.`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">Impresiones hoy</p><p className="mt-1 text-3xl font-bold">{(today._sum.impressions ?? 0).toLocaleString("es-ES")}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Clics hoy</p><p className="mt-1 text-3xl font-bold">{(today._sum.clicks ?? 0).toLocaleString("es-ES")}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">CTR de hoy</p><p className="mt-1 text-3xl font-bold">{pct(today._sum.clicks ?? 0, today._sum.impressions ?? 0)}</p></Card>
      </div>
      <Card className="mb-6">
        <CardHeader title="Nuevo anuncio" description="Sube una imagen de banner (recomendado 728×90 o 320×50) y el enlace del anunciante." />
        <NewAdForm />
      </Card>
      <Card className="overflow-x-auto">
        <CardHeader title="Anuncios" />
        {ads.length === 0 ? <p className="p-5 text-sm text-muted">Aún no hay anuncios. Mientras tanto se muestra la promoción de Forjapp.</p> : (
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-line text-left text-muted"><tr>{["Anuncio", "Enlace", "Peso", "Impresiones", "Clics", "CTR", "Estado", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {ads.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={a.imageUrl} alt="" className="h-10 w-20 rounded bg-card-2 object-contain" /><span className="font-medium">{a.name}</span></div></td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted" title={a.linkUrl}>{a.linkUrl}</td>
                  <td className="px-4 py-3">{a.weight}</td>
                  <td className="px-4 py-3">{a.impressions.toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3">{a.clicks.toLocaleString("es-ES")}</td>
                  <td className="px-4 py-3">{pct(a.clicks, a.impressions)}</td>
                  <td className="px-4 py-3">{a.active ? <Badge tone="green">Activo</Badge> : <Badge>Pausado</Badge>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    <AdminAction url={`/api/v1/admin/ads/${a.id}`} method="PATCH" payload={{ active: !a.active }} success="Anuncio actualizado">{a.active ? "Pausar" : "Activar"}</AdminAction>
                    <AdminAction url={`/api/v1/admin/ads/${a.id}`} method="DELETE" variant="danger" confirmText={`¿Eliminar «${a.name}»?`} success="Anuncio eliminado">Eliminar</AdminAction>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
