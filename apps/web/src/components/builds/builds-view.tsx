"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Hammer, Package, Smartphone, Terminal, XCircle, Info, Pencil } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { BuildStatusBadge, formatBytes, timeAgo } from "@/components/status";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";

interface Build {
  id: string; type: "APK" | "AAB"; status: string; versionCode: number; versionName: string; error: string | null;
  artifactSize: number | null; downloads: number; queuedAt: string; startedAt: string | null; finishedAt: string | null;
}
interface Props {
  project: { id: string; name: string; packageName: string; versionName: string; versionCode: number; primary: string };
  canAab: boolean;
  verified: boolean;
}

const ACTIVE = ["QUEUED", "RUNNING"];

export function BuildsView({ project, canAab, verified }: Props) {
  const toast = useToast();
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [log, setLog] = useState<{ log: string; queuePosition: number } | null>(null);
  const [starting, setStarting] = useState<"APK" | "AAB" | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const load = useCallback(async () => {
    const res = await api<{ builds: Build[] }>(`/api/v1/projects/${project.id}/builds`);
    setBuilds(res.builds);
    return res.builds;
  }, [project.id]);

  useEffect(() => {
    load().then((b) => b[0] && setSelected((s) => s ?? b[0]!.id)).catch((e) => toast((e as Error).message, "error"));
  }, [load, toast]);

  const hasActive = builds?.some((b) => ACTIVE.includes(b.status));
  // Poll the list while something is building and the selected build's log.
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void load().catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [hasActive, load]);

  const selectedBuild = builds?.find((b) => b.id === selected);
  useEffect(() => {
    if (!selected) return;
    let stop = false;
    const fetchLog = async () => {
      const res = await api<{ build: { log: string; queuePosition: number; status: string } }>(`/api/v1/builds/${selected}`).catch(() => null);
      if (stop || !res) return;
      setLog({ log: res.build.log, queuePosition: res.build.queuePosition });
      requestAnimationFrame(() => logRef.current && (logRef.current.scrollTop = logRef.current.scrollHeight));
    };
    void fetchLog();
    const active = selectedBuild && ACTIVE.includes(selectedBuild.status);
    const t = active ? setInterval(fetchLog, 2500) : undefined;
    return () => { stop = true; clearInterval(t); };
  }, [selected, selectedBuild?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (type: "APK" | "AAB") => {
    setStarting(type);
    try {
      const res = await api<{ build: { id: string }; versionBumped: boolean }>(`/api/v1/projects/${project.id}/builds`, { body: { type } });
      if (res.versionBumped) toast("El código de versión se ha incrementado automáticamente", "info");
      toast(`Compilación ${type} en cola`, "success");
      await load();
      setSelected(res.build.id);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setStarting(null);
    }
  };

  const cancel = async (id: string) => {
    try {
      await api(`/api/v1/builds/${id}/cancel`, { method: "POST" });
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <Link href="/apps" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" />Mis aplicaciones</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl text-white shadow" style={{ background: project.primary }}><Smartphone className="size-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted">{project.packageName} · v{project.versionName} ({project.versionCode})</p>
          </div>
        </div>
        <Link href={`/apps/${project.id}/editor`} className={buttonClass("outline")}><Pencil className="size-4" />Volver al editor</Link>
      </div>

      {!verified && <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">Debes verificar tu correo electrónico antes de compilar.</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Smartphone className="size-5" /></span>
            <div className="flex-1">
              <h3 className="font-semibold">APK</h3>
              <p className="mt-1 text-sm text-muted">Instalable directamente en cualquier Android. Ideal para pruebas y distribución propia.</p>
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={() => start("APK")} loading={starting === "APK"} disabled={!!hasActive || !verified}><Hammer className="size-4" />Generar APK</Button>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600"><Package className="size-5" /></span>
            <div className="flex-1">
              <h3 className="font-semibold">AAB (Google Play)</h3>
              <p className="mt-1 text-sm text-muted">Paquete optimizado que exige Google Play para publicar.{!canAab && " Disponible desde el plan Básico."}</p>
            </div>
          </div>
          {canAab ? (
            <Button className="mt-4 w-full" variant="outline" onClick={() => start("AAB")} loading={starting === "AAB"} disabled={!!hasActive || !verified}><Package className="size-4" />Generar AAB</Button>
          ) : (
            <Link href="/billing" className={buttonClass("outline", "md", "mt-4 w-full")}>Mejorar plan</Link>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Historial" description="Las apps se firman siempre con la misma clave para que puedas actualizarlas." />
          {builds === null ? (
            <div className="p-8 text-center text-sm text-muted">Cargando…</div>
          ) : builds.length === 0 ? (
            <EmptyState icon={<Hammer className="size-6" />} title="Sin compilaciones" text="Genera tu primer APK para instalar la app en tu móvil." />
          ) : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto scroll-thin">
              {builds.map((b) => (
                <li key={b.id}>
                  <button onClick={() => setSelected(b.id)} className={cn("flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-card-2", selected === b.id && "bg-brand-500/5")}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{b.type} · v{b.versionName} <span className="text-xs text-muted">({b.versionCode})</span></p>
                      <p className="text-xs text-muted">{timeAgo(b.queuedAt)}{b.artifactSize ? ` · ${formatBytes(b.artifactSize)}` : ""}{b.downloads ? ` · ${b.downloads} descargas` : ""}</p>
                    </div>
                    <BuildStatusBadge status={b.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          {selectedBuild ? (
            <>
              <CardHeader
                title={<span className="flex items-center gap-2"><Terminal className="size-4" />Compilación {selectedBuild.type} v{selectedBuild.versionName}</span>}
                description={selectedBuild.status === "QUEUED" && log ? (log.queuePosition > 0 ? `${log.queuePosition} compilaciones por delante` : "La siguiente en compilarse") : selectedBuild.finishedAt && selectedBuild.startedAt ? `Duración: ${Math.round((+new Date(selectedBuild.finishedAt) - +new Date(selectedBuild.startedAt)) / 1000)} s` : undefined}
                action={
                  selectedBuild.status === "SUCCESS" ? (
                    <a href={`/api/v1/builds/${selectedBuild.id}/download`} className={buttonClass("primary", "sm")} onClick={() => setTimeout(() => void load(), 1500)}><Download className="size-4" />Descargar</a>
                  ) : ACTIVE.includes(selectedBuild.status) ? (
                    <Button size="sm" variant="outline" onClick={() => cancel(selectedBuild.id)}><XCircle className="size-4" />Cancelar</Button>
                  ) : null
                }
              />
              {selectedBuild.error && <div className="mx-5 mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{selectedBuild.error}</div>}
              {selectedBuild.status === "SUCCESS" && selectedBuild.type === "APK" && (
                <div className="mx-5 mt-4 flex gap-2 rounded-xl bg-brand-500/5 p-3 text-sm text-muted"><Info className="mt-0.5 size-4 shrink-0 text-brand-600" />Para instalarlo, abre el archivo en tu Android y permite «instalar apps de origen desconocido».</div>
              )}
              <pre ref={logRef} className="m-5 max-h-[420px] min-h-[240px] flex-1 overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-[11.5px] leading-relaxed text-zinc-300 scroll-thin">{log?.log || "Esperando registro…"}</pre>
            </>
          ) : (
            <EmptyState icon={<Terminal className="size-6" />} title="Registro de compilación" text="Selecciona una compilación para ver su progreso en tiempo real." />
          )}
        </Card>
      </div>
    </div>
  );
}
