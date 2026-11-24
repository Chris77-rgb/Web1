"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export interface LiveState {
  slug: string | null;
  /** Revision that is currently live, or null when the page is offline. */
  liveRevision: number | null;
}

export function PublishModal({
  open, onClose, projectId, live, currentRevision, saving, beforePublish, onChange,
}: {
  open: boolean; onClose: () => void; projectId: string; live: LiveState; currentRevision: number; saving: boolean;
  /** Flushes pending autosave. Returns false if the project couldn't be saved. */
  beforePublish: () => Promise<boolean>;
  onChange: (s: LiveState) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"publish" | "unpublish" | null>(null);
  const [copied, setCopied] = useState(false);
  const isLive = live.liveRevision !== null;
  const outdated = isLive && live.liveRevision !== currentRevision;
  const url = live.slug ? `${typeof location !== "undefined" ? location.origin : ""}/s/${live.slug}` : "";

  const publish = async () => {
    setBusy("publish");
    try {
      if (!(await beforePublish())) throw new Error("Corrige los errores del editor antes de publicar.");
      const res = await api<{ slug: string; revision: number }>(`/api/v1/projects/${projectId}/publish`, { method: "POST" });
      onChange({ slug: res.slug, liveRevision: res.revision });
      toast(isLive ? "Página actualizada" : "¡Página publicada!", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    if (!confirm("¿Quitar la página de internet? El enlace dejará de funcionar hasta que vuelvas a publicarla.")) return;
    setBusy("unpublish");
    try {
      await api(`/api/v1/projects/${projectId}/publish`, { method: "DELETE" });
      onChange({ slug: live.slug, liveRevision: null });
      toast("Página despublicada", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Publicar como página web">
      <div className="flex flex-col gap-4">
        {isLive ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              {outdated ? <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-400"><RefreshCw className="size-3.5" />Hay cambios sin publicar</span>
                : <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-emerald-700 dark:text-emerald-400"><Check className="size-3.5" />En línea y al día</span>}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card-2 p-2 pl-3">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
              <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard?.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar"}
              </Button>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-sm hover:bg-card-2"><ExternalLink className="size-4" />Abrir</a>
            </div>
            <p className="text-xs text-muted">Funciona en móvil, tableta y ordenador. Desde el navegador del móvil se puede añadir a la pantalla de inicio.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={publish} loading={busy === "publish"} disabled={saving || !outdated}>{busy === "publish" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Actualizar página</Button>
              <Button variant="outline" onClick={unpublish} loading={busy === "unpublish"}><WifiOff className="size-4" />Despublicar</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Publica tu app como una página web con su propio enlace, lista para compartir. Podrás actualizarla cuando quieras: los cambios del editor no se ven en la web hasta que la actualices.</p>
            <Button onClick={publish} loading={busy === "publish"} disabled={saving}><Globe className="size-4" />Publicar ahora</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
