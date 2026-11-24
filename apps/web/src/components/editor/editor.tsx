"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, CloudOff, Hammer, Layers, Loader2, Navigation, Palette, Redo2, Settings2, Sparkles, Stamp, Undo2, Smartphone, PencilLine, Wand2,
} from "lucide-react";
import { validateAppConfig, type AppConfig, type PlanCode } from "@forjapp/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api, upload, HttpError } from "@/lib/client";
import { cn } from "@/lib/cn";
import { PhonePreview } from "./phone-preview";
import { BlockInspector, BrandPanel, DesignPanel, NavPanel, PageInspector, PagesPanel, Section, SettingsPanel } from "./panels";

type Tab = "pages" | "design" | "nav" | "brand" | "settings" | "ai";
type SaveState = "saved" | "dirty" | "saving" | "error" | "invalid";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "pages", label: "Páginas", icon: Layers },
  { id: "design", label: "Diseño", icon: Palette },
  { id: "nav", label: "Navegación", icon: Navigation },
  { id: "brand", label: "Marca", icon: Stamp },
  { id: "settings", label: "Android", icon: Settings2 },
  { id: "ai", label: "IA", icon: Sparkles },
];

const AUTOSAVE_MS = 1200;
const HISTORY_LIMIT = 60;

export function Editor({ project, planCode }: { project: { id: string; revision: number; config: AppConfig; status: string }; planCode: PlanCode }) {
  const toast = useToast();
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig>(project.config);
  const [tab, setTab] = useState<Tab>("pages");
  const [pageId, setPageId] = useState(project.config.homePageId);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  const revision = useRef(project.revision);
  const past = useRef<AppConfig[]>([]);
  const future = useRef<AppConfig[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(config);
  const savingPromise = useRef<Promise<boolean> | null>(null);
  latest.current = config;

  // ----- persistence -----
  const persist = useCallback(async (): Promise<boolean> => {
    if (savingPromise.current) await savingPromise.current;
    const snapshot = latest.current;
    const v = validateAppConfig(snapshot);
    if (!v.ok) {
      setErrors(v.errors);
      setSave("invalid");
      return false;
    }
    setErrors([]);
    setSave("saving");
    const p = (async () => {
      try {
        const res = await api<{ project: { revision: number } }>(`/api/v1/projects/${project.id}`, { method: "PATCH", body: { config: snapshot, revision: revision.current } });
        revision.current = res.project.revision;
        setSave(latest.current === snapshot ? "saved" : "dirty");
        return true;
      } catch (e) {
        if (e instanceof HttpError && e.status === 409 && (e.details as { revision?: number })?.revision) setConflict(true);
        else if (e instanceof HttpError && e.status === 422) setErrors(Array.isArray(e.details) ? (e.details as string[]) : [e.message]);
        else toast(e instanceof Error ? e.message : "Error al guardar", "error");
        setSave(e instanceof HttpError && e.status === 422 ? "invalid" : "error");
        return false;
      } finally {
        savingPromise.current = null;
      }
    })();
    savingPromise.current = p;
    return p;
  }, [project.id, toast]);

  const schedule = useCallback(() => {
    setSave("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), AUTOSAVE_MS);
  }, [persist]);

  /** Apply a mutation to a copy of the latest config (sync, so consecutive updates compose). */
  const commit = useCallback(
    (next: AppConfig) => {
      past.current = [...past.current.slice(-HISTORY_LIMIT + 1), latest.current];
      future.current = [];
      latest.current = next;
      setConfig(next);
      schedule();
    },
    [schedule],
  );

  const update = useCallback(
    (fn: (d: AppConfig) => void) => {
      const next = structuredClone(latest.current);
      fn(next);
      commit(next);
    },
    [commit],
  );

  const replace = useCallback(
    (next: AppConfig) => {
      commit(next);
      setPageId(next.homePageId);
      setBlockId(null);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(latest.current);
    latest.current = prev;
    setConfig(prev);
    schedule();
  }, [schedule]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(latest.current);
    latest.current = next;
    setConfig(next);
    schedule();
  }, [schedule]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const inField = (e.target as HTMLElement)?.closest("input,textarea,select");
      if (e.key.toLowerCase() === "s") { e.preventDefault(); clearTimeout(timer.current); void persist(); }
      else if (!inField && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (!inField && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (save === "dirty" || save === "saving") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", beforeUnload); };
  }, [persist, undo, redo, save]);

  // keep selection valid after undo/delete
  useEffect(() => {
    if (!config.pages.some((p) => p.id === pageId)) setPageId(config.homePageId);
    const page = config.pages.find((p) => p.id === pageId);
    if (blockId && !page?.blocks.some((b) => b.id === blockId)) setBlockId(null);
  }, [config, pageId, blockId]);

  const goBuild = async () => {
    clearTimeout(timer.current);
    if (save !== "saved" && !(await persist())) return toast("Corrige los errores antes de compilar", "error");
    router.push(`/apps/${project.id}/builds`);
  };

  const uploadGoogleServices = async (file: File) => {
    try {
      const res = await upload(file, project.id);
      update((d) => { d.integrations.push.googleServicesKey = res.key; });
      toast("Archivo de Firebase guardado", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const ctx = { projectId: project.id, pages: config.pages };
  const panelProps = { config, update, ctx };

  const leftPanel = (
    <div className="flex-1 overflow-y-auto scroll-thin">
      {tab === "pages" && <PagesPanel {...panelProps} pageId={pageId} setPageId={setPageId} blockId={blockId} setBlockId={(id) => { setBlockId(id); }} planCode={planCode} />}
      {tab === "design" && <DesignPanel {...panelProps} />}
      {tab === "nav" && <NavPanel {...panelProps} />}
      {tab === "brand" && <BrandPanel {...panelProps} />}
      {tab === "settings" && <SettingsPanel {...panelProps} planCode={planCode} onUploadGoogleServices={uploadGoogleServices} />}
      {tab === "ai" && <AiPanel config={config} onApply={replace} />}
    </div>
  );

  const inspector = blockId ? (
    <BlockInspector {...panelProps} pageId={pageId} blockId={blockId} />
  ) : (
    <PageInspector {...panelProps} pageId={pageId} onDeleted={() => { setPageId(config.homePageId); setBlockId(null); }} />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-3">
        <Link href="/apps" className="rounded-lg p-2 text-muted hover:bg-card-2 hover:text-fg" aria-label="Volver"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{config.meta.name}</p>
          <SaveIndicator state={save} onRetry={() => void persist()} />
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!past.current.length} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Undo2 className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!future.current.length} aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)"><Redo2 className="size-4" /></Button>
          <ThemeToggle />
        </div>
        <Button onClick={goBuild} size="sm"><Hammer className="size-4" /><span className="hidden sm:inline">Generar APK</span></Button>
      </header>

      {errors.length > 0 && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
          <strong>No se puede guardar:</strong> {errors.slice(0, 3).join(" · ")}
        </div>
      )}

      {/* Mobile switcher */}
      <div className="flex border-b border-line bg-card lg:hidden">
        {([["edit", "Editar", PencilLine], ["preview", "Vista previa", Smartphone]] as const).map(([id, label, I]) => (
          <button key={id} onClick={() => setMobileView(id)} className={cn("flex flex-1 items-center justify-center gap-2 py-2.5 text-sm", mobileView === id ? "border-b-2 border-brand-600 font-medium text-brand-700 dark:text-brand-300" : "text-muted")}><I className="size-4" />{label}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Tab rail */}
        <nav className={cn("flex w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-card py-3", mobileView === "preview" && "max-lg:hidden")}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition", tab === t.id ? "bg-brand-500/10 text-brand-700 dark:text-brand-300" : "text-muted hover:bg-card-2 hover:text-fg")}>
              <t.icon className="size-5" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Left panel */}
        <aside className={cn("flex min-w-0 flex-1 flex-col border-r border-line bg-card lg:w-80 lg:flex-none", mobileView === "preview" && "max-lg:hidden")}>
          {leftPanel}
          {/* On small screens the inspector lives under the panel */}
          {tab === "pages" && <div className="max-h-[50%] overflow-y-auto border-t border-line xl:hidden scroll-thin">{inspector}</div>}
        </aside>

        {/* Preview */}
        <main className={cn("relative flex flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,var(--card-2),var(--bg))] p-6", mobileView === "edit" && "max-lg:hidden")}>
          <PhonePreview
            config={config}
            projectId={project.id}
            pageId={pageId}
            selectedBlockId={blockId}
            onPageChange={(id) => { setPageId(id); setBlockId(null); }}
            onBlockClick={(pid, bid) => { setTab("pages"); setPageId(pid); setBlockId(bid); }}
            scale={0.92}
          />
        </main>

        {/* Inspector (wide screens) */}
        {tab === "pages" && <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line bg-card xl:block scroll-thin">{inspector}</aside>}
      </div>

      <Modal open={conflict} onClose={() => setConflict(false)} title="Cambios en otra pestaña">
        <p className="text-sm text-muted">Este proyecto se ha guardado desde otra pestaña o dispositivo. Para no sobrescribir esos cambios, recarga el editor.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConflict(false)}>Cancelar</Button>
          <Button onClick={() => location.reload()}>Recargar</Button>
        </div>
      </Modal>
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const map: Record<SaveState, React.ReactNode> = {
    saved: <><Check className="size-3" />Guardado</>,
    dirty: <>Cambios sin guardar…</>,
    saving: <><Loader2 className="size-3 animate-spin" />Guardando…</>,
    error: <button onClick={onRetry} className="flex items-center gap-1 text-red-500"><CloudOff className="size-3" />Error al guardar · Reintentar</button>,
    invalid: <span className="text-red-500">Configuración no válida</span>,
  };
  return <p className="flex items-center gap-1 text-xs text-muted">{map[state]}</p>;
}

// ---------------------------------------------------------------- AI assistant (edit current app)
function AiPanel({ config, onApply }: { config: AppConfig; onApply: (c: AppConfig) => void }) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string>("");

  const run = async () => {
    if (prompt.trim().length < 5) return;
    setBusy(true);
    try {
      const res = await api<{ config: AppConfig; summary: string; source: string }>("/api/v1/ai/generate", { body: { prompt, current: config } });
      res.config.meta.packageName = config.meta.packageName; // never change the app id from AI
      res.config.meta.versionCode = config.meta.versionCode;
      onApply(res.config);
      setLast(res.summary);
      setPrompt("");
      toast("Cambios aplicados. Puedes deshacerlos con Ctrl+Z.", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Asistente de IA">
      <p className="-mt-1 text-sm text-muted">Pide cambios en lenguaje natural. La IA modificará la app y podrás seguir editándola a mano.</p>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} maxLength={2000} placeholder="Ej: añade una página de ofertas con 3 productos, cambia los colores a tonos verdes y pon un formulario de reservas" />
      <div className="flex flex-wrap gap-1.5">
        {["Hazla más elegante y oscura", "Añade una galería de fotos", "Añade página de contacto con mapa", "Traduce los textos al inglés"].map((s) => (
          <button key={s} onClick={() => setPrompt(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-brand-500 hover:text-fg">{s}</button>
        ))}
      </div>
      <Button onClick={run} loading={busy} disabled={prompt.trim().length < 5}><Wand2 className="size-4" />Aplicar con IA</Button>
      {last && <div className="rounded-xl bg-brand-500/5 p-3 text-sm"><p className="mb-1 flex items-center gap-1.5 font-medium"><Sparkles className="size-4 text-brand-600" />Último cambio</p><p className="whitespace-pre-line text-muted">{last}</p></div>}
    </Section>
  );
}
