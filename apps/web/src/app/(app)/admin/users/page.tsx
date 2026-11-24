import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui/card";
import { AdminAction, PlanSelect } from "@/components/admin/action";
import { timeAgo } from "@/components/status";

export const metadata = { title: "Usuarios · Admin" };
const PAGE = 50;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireAdminPage();
  const { q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  const [users, total, plans] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * PAGE, take: PAGE, include: { _count: { select: { projects: true, builds: true } } } }),
    db.user.count({ where }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, name: true } }),
  ]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Usuarios" description={`${total} usuarios`} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Buscar por nombre o email…" className="w-full max-w-sm rounded-xl border border-line bg-card px-3 py-2 text-sm" /></form>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-muted"><tr>{["Usuario", "Plan", "Apps", "Builds", "Alta", "Estado", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><p className="font-medium">{u.name} {u.role === "ADMIN" && <Badge tone="brand">admin</Badge>}</p><p className="text-xs text-muted">{u.email}</p></td>
                <td className="px-4 py-3"><PlanSelect userId={u.id} value={u.planCode} plans={plans} /></td>
                <td className="px-4 py-3">{u._count.projects}</td>
                <td className="px-4 py-3">{u._count.builds}</td>
                <td className="px-4 py-3 text-muted">{timeAgo(u.createdAt)}</td>
                <td className="px-4 py-3">{u.disabled ? <Badge tone="red">Desactivado</Badge> : u.emailVerifiedAt ? <Badge tone="green">Activo</Badge> : <Badge tone="amber">Sin verificar</Badge>}</td>
                <td className="px-4 py-3">
                  {u.id !== me.id && (
                    <div className="flex justify-end gap-1.5">
                      {!u.emailVerifiedAt && <AdminAction url={`/api/v1/admin/users/${u.id}`} method="PATCH" payload={{ verifyEmail: true }} success="Email verificado">Verificar</AdminAction>}
                      <AdminAction url={`/api/v1/admin/users/${u.id}`} method="PATCH" payload={{ role: u.role === "ADMIN" ? "USER" : "ADMIN" }} success="Rol actualizado">{u.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}</AdminAction>
                      <AdminAction url={`/api/v1/admin/users/${u.id}`} method="PATCH" payload={{ disabled: !u.disabled }} success="Estado actualizado">{u.disabled ? "Activar" : "Desactivar"}</AdminAction>
                      <AdminAction url={`/api/v1/admin/users/${u.id}`} method="DELETE" variant="danger" confirmText={`¿Eliminar a ${u.email} y todas sus apps?`} success="Usuario eliminado">Eliminar</AdminAction>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {total > PAGE && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {p > 1 && <Link className="rounded-lg border border-line px-3 py-1" href={`?q=${encodeURIComponent(q)}&page=${p - 1}`}>Anterior</Link>}
          <span className="px-3 py-1 text-muted">Página {p} de {Math.ceil(total / PAGE)}</span>
          {p * PAGE < total && <Link className="rounded-lg border border-line px-3 py-1" href={`?q=${encodeURIComponent(q)}&page=${p + 1}`}>Siguiente</Link>}
        </div>
      )}
    </div>
  );
}
