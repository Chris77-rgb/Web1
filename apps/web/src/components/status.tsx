import { CheckCircle2, Clock, Loader2, XCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/card";

export function BuildStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUCCESS": return <Badge tone="green"><CheckCircle2 className="size-3.5" />Completada</Badge>;
    case "FAILED": return <Badge tone="red"><XCircle className="size-3.5" />Fallida</Badge>;
    case "RUNNING": return <Badge tone="blue"><Loader2 className="size-3.5 animate-spin" />Compilando</Badge>;
    case "QUEUED": return <Badge tone="amber"><Clock className="size-3.5" />En cola</Badge>;
    default: return <Badge><Ban className="size-3.5" />Cancelada</Badge>;
  }
}

export function ProjectStatusBadge({ status }: { status: string }) {
  if (status === "PUBLISHED") return <Badge tone="green">Publicada</Badge>;
  if (status === "ARCHIVED") return <Badge>Archivada</Badge>;
  return <Badge tone="brand">En desarrollo</Badge>;
}

export function timeAgo(d: Date | string): string {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  return days < 30 ? `hace ${days} d` : new Date(d).toLocaleDateString("es-ES");
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
