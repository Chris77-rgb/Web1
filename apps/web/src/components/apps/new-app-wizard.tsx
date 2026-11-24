"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, LayoutTemplate, Check, Wand2, RotateCcw } from "lucide-react";
import type { AppConfig } from "@forjapp/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { PhonePreview } from "@/components/editor/phone-preview";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";

interface Tpl { id: string; name: string; category: string; description: string; accent: string; pages: string[]; dark: boolean }

const EXAMPLES = [
  "Quiero crear una aplicación para mi restaurante con menú, reservas, fotografías, ubicación y contacto",
  "App para mi emisora de radio online con reproductor en directo, programación y redes sociales",
  "Una app de noticias de tecnología con RSS de Xataka, buscador y favoritos",
  "App para mi gimnasio con horarios de clases, tarifas, formulario de inscripción y mapa",
];

export function NewAppWizard({ categories, templates }: { categories: { id: string; label: string }[]; templates: Tpl[] }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"templates" | "ai">(useSearchParams().get("ai") ? "ai" : "templates");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string>("blank");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  // AI state
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ config: AppConfig; summary: string; source: string } | null>(null);

  const visible = useMemo(() => (category === "all" ? templates : templates.filter((t) => t.category === category)), [category, templates]);

  async function create(config?: AppConfig) {
    const appName = (name || config?.meta.name || templates.find((t) => t.id === selected)?.name || "Mi App").trim();
    setCreating(true);
    try {
      const { project } = await api<{ project: { id: string } }>("/api/v1/projects", { body: config ? { name: appName, config } : { name: appName, templateId: selected } });
      router.push(`/apps/${project.id}/editor`);
    } catch (e) {
      toast((e as Error).message, "error");
      setCreating(false);
    }
  }

  async function generate() {
    if (prompt.trim().length < 10) return toast("Describe tu app con un poco más de detalle", "info");
    setGenerating(true);
    try {
      const res = await api<{ config: AppConfig; summary: string; source: string }>("/api/v1/ai/generate", { body: { prompt, name: name || undefined } });
      setAiResult(res);
      if (!name) setName(res.config.meta.name);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Crear aplicación</h1>
        <p className="mt-1 text-sm text-muted">Empieza desde una plantilla o describe tu idea y deja que la IA la construya.</p>
      </div>

      <div className="mb-6 inline-flex rounded-xl border border-line bg-card p-1">
        {[
          { id: "templates" as const, label: "Plantillas", icon: LayoutTemplate },
          { id: "ai" as const, label: "Crear con IA", icon: Sparkles },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition", tab === t.id ? "bg-brand-600 text-white shadow" : "text-muted hover:text-fg")}>
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scroll-thin">
            {[{ id: "all", label: "Todas" }, ...categories].map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition", category === c.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-card text-muted hover:text-fg")}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)} className={cn("group relative overflow-hidden rounded-2xl border-2 bg-card text-left transition hover:-translate-y-0.5 hover:shadow-md", selected === t.id ? "border-brand-600 shadow-md" : "border-line")}>
                <div className="flex h-32 items-end gap-1.5 p-3" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}aa)` }}>
                  {t.pages.slice(0, 4).map((p) => (
                    <span key={p} className={cn("rounded-md px-2 py-1 text-[10px] font-medium", t.dark ? "bg-black/40 text-white" : "bg-white/85 text-zinc-800")}>{p}</span>
                  ))}
                </div>
                <div className="p-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                </div>
                {selected === t.id && <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-white text-brand-600 shadow"><Check className="size-4" /></span>}
              </button>
            ))}
          </div>
          <Card className="sticky bottom-4 mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <Field label="Nombre de la aplicación" className="flex-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder={templates.find((t) => t.id === selected)?.name} />
            </Field>
            <Button size="lg" onClick={() => create()} loading={creating}>Crear y abrir el editor</Button>
          </Card>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <Field label="Describe tu aplicación" hint="Cuanto más detalle (secciones, estilo, colores, datos de contacto…), mejor será el resultado.">
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} maxLength={2000} placeholder="Quiero crear una aplicación para mi restaurante con menú, reservas, fotografías, ubicación y contacto…" />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => setPrompt(ex)} className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-brand-500 hover:text-fg">
                    {ex.length > 60 ? `${ex.slice(0, 60)}…` : ex}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Nombre (opcional)" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} /></Field>
                <Button size="lg" onClick={generate} loading={generating}>
                  {aiResult ? <RotateCcw className="size-4" /> : <Wand2 className="size-4" />}
                  {aiResult ? "Regenerar" : "Generar app"}
                </Button>
              </div>
            </Card>
            {aiResult && (
              <Card className="animate-slide-up p-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-brand-600" />Propuesta de la IA</div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{aiResult.summary}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {aiResult.config.pages.map((p) => <li key={p.id} className="rounded-lg bg-card-2 px-2.5 py-1 text-xs">{p.title} · {p.blocks.length} bloques</li>)}
                </ul>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  Colores: {[aiResult.config.theme.primary, aiResult.config.theme.secondary, aiResult.config.theme.background].map((c) => <span key={c} className="inline-block size-4 rounded-full border border-line" style={{ background: c }} title={c} />)}
                  · Fuente {aiResult.config.theme.font}
                  {aiResult.source === "rules" && " · (generador sin conexión a IA)"}
                </div>
                <Button className="mt-4 w-full" size="lg" onClick={() => create(aiResult.config)} loading={creating}>Crear esta app y seguir editando</Button>
              </Card>
            )}
          </div>
          <div className="hidden lg:block">
            {aiResult ? (
              <PhonePreview config={aiResult.config} scale={0.85} />
            ) : (
              <div className="flex h-[595px] w-[289px] flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-line text-center text-sm text-muted">
                <Sparkles className="size-8 text-brand-500" />
                La vista previa aparecerá aquí
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
