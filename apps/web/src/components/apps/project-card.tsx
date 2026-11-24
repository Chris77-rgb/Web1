"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Hammer, Copy, Trash2, Inbox, Globe, WifiOff, ExternalLink } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { BuildStatusBadge, ProjectStatusBadge, timeAgo } from "@/components/status";

interface P {
  id: string; name: string; packageName: string; status: string; updatedAt: string; primary: string; secondary: string;
  iconUrl: string | null; slug: string | null; pages: number; lastBuild: { status: string; type: string } | null; unread: number;
}

export function ProjectCard({ project: p }: { project: P }) {
  const router = useRouter();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setMenu(false);
    try {
      await fn();
      toast(okMsg, "success");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${busy ? "opacity-60" : ""}`}>
      <Link href={`/apps/${p.id}/editor`} className="block">
        <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}>
          <div className="absolute -bottom-7 left-5 flex size-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-card text-xl font-bold shadow" style={{ color: p.primary }}>
            {p.iconUrl ? <img src={p.iconUrl} alt="" className="size-full object-cover" /> : p.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
        <div className="px-5 pb-4 pt-9">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold">{p.name}</h3>
            <ProjectStatusBadge status={p.status} />
          </div>
          <p className="truncate text-xs text-muted">{p.packageName}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{p.pages} {p.pages === 1 ? "página" : "páginas"}</span>·<span>{timeAgo(p.updatedAt)}</span>
            {p.lastBuild && <BuildStatusBadge status={p.lastBuild.status} />}
            {p.unread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 font-medium text-white">{p.unread} nuevos</span>}
          </div>
        </div>
      </Link>
      <button onClick={() => setMenu((m) => !m)} className="absolute right-3 top-3 rounded-lg bg-black/25 p-1.5 text-white backdrop-blur hover:bg-black/40" aria-label="Acciones">
        <MoreVertical className="size-4" />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="animate-fade-in absolute right-3 top-12 z-20 w-52 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-xl">
            <MenuLink href={`/apps/${p.id}/editor`} icon={<Pencil className="size-4" />}>Editar</MenuLink>
            <MenuLink href={`/apps/${p.id}/builds`} icon={<Hammer className="size-4" />}>Compilar y descargar</MenuLink>
            <MenuLink href={`/apps/${p.id}/data`} icon={<Inbox className="size-4" />}>Formularios y usuarios</MenuLink>
            {p.status === "PUBLISHED" && p.slug && <MenuLink href={`/s/${p.slug}`} icon={<ExternalLink className="size-4" />} external>Ver página web</MenuLink>}
            {p.status === "PUBLISHED" ? (
              <MenuBtn icon={<WifiOff className="size-4" />} onClick={() => act(() => api(`/api/v1/projects/${p.id}/publish`, { method: "DELETE" }), "Página despublicada")}>Despublicar</MenuBtn>
            ) : (
              <MenuBtn icon={<Globe className="size-4" />} onClick={() => act(() => api(`/api/v1/projects/${p.id}/publish`, { method: "POST" }), "¡Página publicada!")}>Publicar como web</MenuBtn>
            )}
            <MenuBtn icon={<Copy className="size-4" />} onClick={() => act(() => api(`/api/v1/projects/${p.id}/duplicate`, { method: "POST" }), "App duplicada")}>Duplicar</MenuBtn>
            <MenuBtn danger icon={<Trash2 className="size-4" />} onClick={() => confirm(`¿Eliminar "${p.name}" y todas sus compilaciones? Esta acción no se puede deshacer.`) && act(() => api(`/api/v1/projects/${p.id}`, { method: "DELETE" }), "App eliminada")}>Eliminar</MenuBtn>
          </div>
        </>
      )}
    </div>
  );
}

const itemCls = "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-card-2";
function MenuLink({ href, icon, children, external }: { href: string; icon: React.ReactNode; children: React.ReactNode; external?: boolean }) {
  return <Link href={href} className={itemCls} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{icon}{children}</Link>;
}
function MenuBtn({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`${itemCls} ${danger ? "text-red-600" : ""}`}>{icon}{children}</button>;
}
