import { db } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui/card";
import { AdminAction } from "@/components/admin/action";

export const metadata = { title: "Plantillas · Admin" };

export default async function AdminTemplates() {
  const templates = await db.template.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Plantillas" description="Activa, desactiva o elimina plantillas. Para crear una nueva, diseña una app y usa «Crear plantilla» en Proyectos." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const pages = ((t.config as { pages?: { title: string }[] }).pages ?? []).map((p) => p.title);
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="h-16" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}88)` }} />
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{t.name}</h3>{t.active ? <Badge tone="green">Activa</Badge> : <Badge>Inactiva</Badge>}</div>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
                <p className="mt-2 text-xs text-muted">{t.category} · {pages.join(", ")}</p>
                <div className="mt-4 flex gap-2">
                  <AdminAction url={`/api/v1/admin/templates/${t.id}`} method="PATCH" payload={{ active: !t.active }} success="Plantilla actualizada">{t.active ? "Desactivar" : "Activar"}</AdminAction>
                  <AdminAction url={`/api/v1/admin/templates/${t.id}`} method="DELETE" variant="danger" confirmText={`¿Eliminar la plantilla «${t.name}»?`} success="Plantilla eliminada">Eliminar</AdminAction>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
