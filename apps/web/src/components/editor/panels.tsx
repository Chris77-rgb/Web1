"use client";
import { useState } from "react";
import {
  ArrowDown, ArrowUp, Copy, GripVertical, Home, Lock, Plus, Trash2, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import {
  ANDROID_PERMISSIONS, FONTS, MODULES, MODULE_CATEGORIES, MODULE_MAP, computePermissions, createBlock, newId, planAllows,
  type AppConfig, type PlanCode,
} from "@forjapp/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { ColorInput, FieldInput, IconSelect, ImageInput, Toggle, type FieldCtx } from "./fields";
import { ModuleIcon } from "./module-icon";

export type Update = (fn: (draft: AppConfig) => void) => void;

interface PanelProps {
  config: AppConfig;
  update: Update;
  ctx: FieldCtx;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- Pages & blocks
export function PagesPanel({
  config, update, pageId, setPageId, blockId, setBlockId, planCode,
}: PanelProps & { pageId: string; setPageId: (id: string) => void; blockId: string | null; setBlockId: (id: string | null) => void; planCode: PlanCode }) {
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const page = config.pages.find((p) => p.id === pageId) ?? config.pages[0]!;
  const pIdx = config.pages.findIndex((p) => p.id === page.id);

  const addPage = () => {
    const id = newId("page");
    update((d) => {
      d.pages.push({ id, title: `Página ${d.pages.length + 1}`, icon: "file", hideHeader: false, blocks: [] });
      if (d.navigation.type !== "none" && d.navigation.items.length < 5) d.navigation.items.push({ id: newId("nav"), label: `Página ${d.pages.length}`, icon: "file", pageId: id });
    });
    setPageId(id);
    setBlockId(null);
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= page.blocks.length || from === to) return;
    update((d) => {
      const blocks = d.pages[pIdx]!.blocks;
      const [b] = blocks.splice(from, 1);
      blocks.splice(to, 0, b!);
    });
  };

  return (
    <>
      <Section title="Páginas" action={<button onClick={addPage} className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300"><Plus className="size-3.5" />Nueva</button>}>
        <ul className="flex flex-col gap-1">
          {config.pages.map((p, i) => (
            <li key={p.id}>
              <button
                onClick={() => { setPageId(p.id); setBlockId(null); }}
                className={cn("group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition", p.id === page.id ? "bg-brand-500/10 font-medium text-brand-700 dark:text-brand-300" : "hover:bg-card-2")}
              >
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {p.id === config.homePageId && <Home className="size-3.5 shrink-0" aria-label="Página de inicio" />}
                <span className="text-xs text-muted">{p.blocks.length}</span>
                <span className="hidden gap-0.5 group-hover:flex">
                  <span role="button" tabIndex={0} aria-label="Subir página" onClick={(e) => { e.stopPropagation(); if (i > 0) update((d) => { const [x] = d.pages.splice(i, 1); d.pages.splice(i - 1, 0, x!); }); }} className="rounded p-0.5 hover:bg-line"><ArrowUp className="size-3.5" /></span>
                  <span role="button" tabIndex={0} aria-label="Bajar página" onClick={(e) => { e.stopPropagation(); if (i < config.pages.length - 1) update((d) => { const [x] = d.pages.splice(i, 1); d.pages.splice(i + 1, 0, x!); }); }} className="rounded p-0.5 hover:bg-line"><ArrowDown className="size-3.5" /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Bloques de «${page.title}»`}>
        {page.blocks.length === 0 && <p className="rounded-xl bg-card-2 p-3 text-center text-sm text-muted">Esta página está vacía.</p>}
        <ul className="flex flex-col gap-1.5">
          {page.blocks.map((b, i) => {
            const def = MODULE_MAP[b.type];
            const locked = !planAllows(planCode, def?.minPlan);
            return (
              <li
                key={b.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null) moveBlock(dragIdx, i); setDragIdx(null); }}
                className={cn("group flex items-center gap-2 rounded-xl border px-2 py-2 transition", b.id === blockId ? "border-brand-500 bg-brand-500/5" : "border-line bg-card hover:border-brand-300", dragIdx === i && "opacity-40")}
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted" />
                <button onClick={() => setBlockId(b.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ModuleIcon name={def?.icon ?? "box"} className="size-4 shrink-0 text-brand-600 dark:text-brand-300" />
                  <span className="truncate text-sm">{blockSummary(b.type, b.props)}</span>
                  {locked && <Lock className="size-3.5 shrink-0 text-amber-500" aria-label="Requiere un plan superior" />}
                </button>
                <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <IconBtn label="Subir" onClick={() => moveBlock(i, i - 1)}><ArrowUp className="size-3.5" /></IconBtn>
                  <IconBtn label="Bajar" onClick={() => moveBlock(i, i + 1)}><ArrowDown className="size-3.5" /></IconBtn>
                  <IconBtn label="Duplicar" onClick={() => { const id = newId("b"); update((d) => { d.pages[pIdx]!.blocks.splice(i + 1, 0, { ...structuredClone(b), id }); }); setBlockId(id); }}><Copy className="size-3.5" /></IconBtn>
                  <IconBtn label="Eliminar" danger onClick={() => { update((d) => { d.pages[pIdx]!.blocks.splice(i, 1); }); if (blockId === b.id) setBlockId(null); }}><Trash2 className="size-3.5" /></IconBtn>
                </span>
              </li>
            );
          })}
        </ul>
        <Button variant="outline" onClick={() => setAdding(true)} disabled={page.blocks.length >= 100}><Plus className="size-4" />Añadir bloque</Button>
      </Section>

      <AddBlockModal
        open={adding}
        onClose={() => setAdding(false)}
        planCode={planCode}
        onPick={(type) => {
          const id = newId("b");
          update((d) => { d.pages[pIdx]!.blocks.push(createBlock(type, id)); });
          setBlockId(id);
          setAdding(false);
        }}
      />
    </>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return <button onClick={onClick} aria-label={label} title={label} className={cn("rounded-md p-1 hover:bg-card-2", danger ? "text-red-500" : "text-muted")}>{children}</button>;
}

function blockSummary(type: string, props: Record<string, unknown>): string {
  const label = MODULE_MAP[type]?.label ?? type;
  const text = [props.title, props.text, props.label, props.stationName, props.caption].find((v) => typeof v === "string" && v.trim());
  return text ? `${label}: ${String(text).slice(0, 40)}` : label;
}

function AddBlockModal({ open, onClose, onPick, planCode }: { open: boolean; onClose: () => void; onPick: (type: string) => void; planCode: PlanCode }) {
  return (
    <Modal open={open} onClose={onClose} title="Añadir bloque" className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        {MODULE_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{cat.label}</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULES.filter((m) => m.category === cat.id).map((m) => {
                const locked = !planAllows(planCode, m.minPlan);
                return (
                  <button key={m.type} onClick={() => onPick(m.type)} className="flex items-start gap-3 rounded-xl border border-line p-3 text-left transition hover:border-brand-500 hover:bg-brand-500/5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300"><ModuleIcon name={m.icon} className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">{m.label}{locked && <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-400"><Lock className="size-2.5" />{m.minPlan}</span>}</span>
                      <span className="mt-0.5 block text-xs text-muted">{m.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">Los módulos con candado se pueden añadir y probar en la vista previa, pero necesitas el plan indicado para compilarlos.</p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Inspector
export function BlockInspector({ config, update, ctx, pageId, blockId }: PanelProps & { pageId: string; blockId: string }) {
  const pIdx = config.pages.findIndex((p) => p.id === pageId);
  const page = config.pages[pIdx];
  const bIdx = page?.blocks.findIndex((b) => b.id === blockId) ?? -1;
  const block = page?.blocks[bIdx];
  if (!page || !block) return null;
  const def = MODULE_MAP[block.type];
  if (!def) return <Section title="Bloque"><p className="text-sm text-muted">Tipo de bloque desconocido: {block.type}</p></Section>;
  return (
    <Section title={def.label}>
      <p className="-mt-1 text-xs text-muted">{def.description}</p>
      {def.fields.length === 0 && <p className="text-sm text-muted">Este bloque no tiene opciones.</p>}
      {def.fields.map((f) => (
        <FieldInput key={f.key} def={f} value={block.props[f.key]} ctx={ctx} onChange={(v) => update((d) => { d.pages[pIdx]!.blocks[bIdx]!.props[f.key] = v; })} />
      ))}
      {def.permissions?.length ? <p className="text-xs text-muted">Permisos Android: {def.permissions.join(", ")}</p> : null}
    </Section>
  );
}

export function PageInspector({ config, update, pageId, onDeleted }: PanelProps & { pageId: string; onDeleted: () => void }) {
  const pIdx = config.pages.findIndex((p) => p.id === pageId);
  const page = config.pages[pIdx];
  if (!page) return null;
  const isHome = page.id === config.homePageId;
  return (
    <Section title="Página">
      <Field label="Título"><Input value={page.title} maxLength={60} onChange={(e) => update((d) => { d.pages[pIdx]!.title = e.target.value || " "; })} /></Field>
      <Field label="Icono"><IconSelect value={page.icon} onChange={(v) => update((d) => { d.pages[pIdx]!.icon = v; })} /></Field>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium">{page.hideHeader ? <EyeOff className="size-4" /> : <Eye className="size-4" />}Ocultar barra superior</span>
        <Toggle checked={page.hideHeader} onChange={(v) => update((d) => { d.pages[pIdx]!.hideHeader = v; })} />
      </label>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" disabled={isHome} onClick={() => update((d) => { d.homePageId = page.id; })}><Home className="size-4" />{isHome ? "Es la de inicio" : "Usar como inicio"}</Button>
        <Button
          variant="outline" size="sm" className="text-red-600" disabled={isHome || config.pages.length <= 1}
          onClick={() => {
            if (!confirm(`¿Eliminar la página «${page.title}»?`)) return;
            update((d) => {
              d.pages.splice(pIdx, 1);
              d.navigation.items = d.navigation.items.filter((n) => n.pageId !== page.id);
            });
            onDeleted();
          }}
        ><Trash2 className="size-4" />Eliminar</Button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Design
const PRESETS = [
  { name: "Violeta", primary: "#6D28D9", secondary: "#F59E0B" },
  { name: "Océano", primary: "#0369A1", secondary: "#14B8A6" },
  { name: "Bosque", primary: "#166534", secondary: "#CA8A04" },
  { name: "Coral", primary: "#E11D48", secondary: "#0EA5E9" },
  { name: "Grafito", primary: "#111827", secondary: "#6366F1" },
  { name: "Terracota", primary: "#B45309", secondary: "#15803D" },
];

export function DesignPanel({ config, update }: PanelProps) {
  const t = config.theme;
  const setMode = (mode: "light" | "dark") =>
    update((d) => {
      d.theme.mode = mode;
      d.theme.background = mode === "dark" ? "#0B0F19" : "#F8FAFC";
      d.theme.surface = mode === "dark" ? "#151B2B" : "#FFFFFF";
      d.theme.text = mode === "dark" ? "#E2E8F0" : "#0F172A";
    });
  return (
    <>
      <Section title="Combinaciones">
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => update((d) => { d.theme.primary = p.primary; d.theme.secondary = p.secondary; d.branding.splashColor = p.primary; })} className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-2 text-xs hover:border-brand-500">
              <span className="flex"><span className="size-5 rounded-full" style={{ background: p.primary }} /><span className="-ml-1.5 size-5 rounded-full ring-2 ring-card" style={{ background: p.secondary }} /></span>
              {p.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Modo">
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("rounded-xl border py-2 text-sm", t.mode === m ? "border-brand-500 bg-brand-500/10 font-medium" : "border-line")}>{m === "light" ? "Claro" : "Oscuro"}</button>
          ))}
        </div>
      </Section>
      <Section title="Colores">
        {([["primary", "Principal"], ["secondary", "Secundario / acento"], ["background", "Fondo"], ["surface", "Tarjetas"], ["text", "Texto"]] as const).map(([k, label]) => (
          <Field key={k} label={label}><ColorInput value={t[k]} onChange={(v) => update((d) => { d.theme[k] = v; })} /></Field>
        ))}
      </Section>
      <Section title="Tipografía y forma">
        <Field label="Fuente">
          <Select value={t.font} onChange={(e) => update((d) => { d.theme.font = e.target.value as AppConfig["theme"]["font"]; })}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </Field>
        <Field label={`Redondez de esquinas: ${t.radius}px`}>
          <input type="range" min={0} max={32} value={t.radius} onChange={(e) => update((d) => { d.theme.radius = Number(e.target.value); })} className="accent-brand-600" />
        </Field>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Navigation
export function NavPanel({ config, update }: PanelProps) {
  const nav = config.navigation;
  return (
    <>
      <Section title="Tipo de navegación">
        <div className="grid grid-cols-3 gap-2">
          {([["bottom", "Pestañas"], ["drawer", "Menú lateral"], ["none", "Ninguna"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => update((d) => { d.navigation.type = v; })} className={cn("rounded-xl border py-2 text-sm", nav.type === v ? "border-brand-500 bg-brand-500/10 font-medium" : "border-line")}>{l}</button>
          ))}
        </div>
        {nav.type === "bottom" && nav.items.length > 5 && <p className="text-xs text-amber-600">Con pestañas inferiores se recomiendan 5 elementos como máximo.</p>}
      </Section>
      {nav.type !== "none" && (
        <Section
          title="Elementos del menú"
          action={<button onClick={() => update((d) => { d.navigation.items = d.pages.slice(0, 8).map((p) => ({ id: newId("nav"), label: p.title.slice(0, 30), icon: p.icon, pageId: p.id })); })} className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300"><RefreshCw className="size-3.5" />Usar páginas</button>}
        >
          {nav.items.map((it, i) => (
            <div key={it.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="flex gap-2">
                <Input value={it.label} maxLength={30} onChange={(e) => update((d) => { d.navigation.items[i]!.label = e.target.value || " "; })} aria-label="Texto" />
                <IconBtn label="Subir" onClick={() => i > 0 && update((d) => { const [x] = d.navigation.items.splice(i, 1); d.navigation.items.splice(i - 1, 0, x!); })}><ArrowUp className="size-4" /></IconBtn>
                <IconBtn label="Eliminar" danger onClick={() => update((d) => { d.navigation.items.splice(i, 1); })}><Trash2 className="size-4" /></IconBtn>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <IconSelect value={it.icon} onChange={(v) => update((d) => { d.navigation.items[i]!.icon = v; })} />
                <Select value={it.pageId} onChange={(e) => update((d) => { d.navigation.items[i]!.pageId = e.target.value; })} aria-label="Página">
                  {config.pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" disabled={nav.items.length >= 8} onClick={() => update((d) => { const p = d.pages[0]!; d.navigation.items.push({ id: newId("nav"), label: p.title.slice(0, 30), icon: p.icon, pageId: p.id }); })}><Plus className="size-4" />Añadir elemento</Button>
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Branding
export function BrandPanel({ config, update, ctx }: PanelProps) {
  return (
    <>
      <Section title="Nombre">
        <Field label="Nombre de la aplicación" hint="Es el nombre que aparece bajo el icono en el móvil."><Input value={config.meta.name} maxLength={50} onChange={(e) => update((d) => { d.meta.name = e.target.value || " "; })} /></Field>
        <Field label="Descripción"><Textarea value={config.meta.description} maxLength={500} rows={3} onChange={(e) => update((d) => { d.meta.description = e.target.value; })} /></Field>
      </Section>
      <Section title="Icono de la app">
        <p className="-mt-1 text-xs text-muted">Imagen cuadrada de al menos 512×512 px. Se generan automáticamente todos los tamaños de Android.</p>
        <ImageInput value={config.branding.iconUrl ?? ""} projectId={ctx.projectId} onChange={(v) => update((d) => { d.branding.iconUrl = v || undefined; })} />
      </Section>
      <Section title="Logotipo">
        <p className="-mt-1 text-xs text-muted">Se muestra en la barra superior y en el menú.</p>
        <ImageInput value={config.branding.logoUrl ?? ""} projectId={ctx.projectId} onChange={(v) => update((d) => { d.branding.logoUrl = v || undefined; })} />
      </Section>
      <Section title="Pantalla de carga">
        <Field label="Color de fondo"><ColorInput value={config.branding.splashColor} onChange={(v) => update((d) => { d.branding.splashColor = v; })} /></Field>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Android settings
export function SettingsPanel({ config, update, planCode, onUploadGoogleServices }: PanelProps & { planCode: PlanCode; onUploadGoogleServices: (f: File) => void }) {
  const m = config.meta;
  const auto = computePermissions({ ...config, meta: { ...m, permissions: [] } });
  return (
    <>
      <Section title="Identificación">
        <Field label="Identificador de paquete" hint="Único en Google Play. No lo cambies después de publicar.">
          <Input value={m.packageName} maxLength={150} className="font-mono text-xs" onChange={(e) => update((d) => { d.meta.packageName = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""); })} />
        </Field>
      </Section>
      <Section title="Versión">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre de versión"><Input value={m.versionName} maxLength={20} onChange={(e) => update((d) => { d.meta.versionName = e.target.value; })} /></Field>
          <Field label="Código de versión"><Input type="number" min={1} value={m.versionCode} onChange={(e) => update((d) => { d.meta.versionCode = Math.max(1, Math.floor(Number(e.target.value) || 1)); })} /></Field>
        </div>
        <p className="text-xs text-muted">El código se incrementa automáticamente en cada compilación si ya se usó.</p>
      </Section>
      <Section title="Pantalla">
        <Field label="Orientación">
          <Select value={m.orientation} onChange={(e) => update((d) => { d.meta.orientation = e.target.value as typeof m.orientation; })}>
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
            <option value="auto">Automática</option>
          </Select>
        </Field>
      </Section>
      <Section title="Permisos Android">
        <p className="-mt-1 text-xs text-muted">Los permisos que necesitan tus módulos se añaden solos. Marca solo los adicionales.</p>
        <div className="flex flex-col gap-1">
          {ANDROID_PERMISSIONS.map((p) => {
            const isAuto = auto.includes(p);
            const checked = isAuto || m.permissions.includes(p);
            return (
              <label key={p} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs", isAuto ? "text-muted" : "cursor-pointer hover:bg-card-2")}>
                <input
                  type="checkbox" checked={checked} disabled={isAuto} className="accent-brand-600"
                  onChange={(e) => update((d) => { d.meta.permissions = e.target.checked ? [...new Set([...d.meta.permissions, p])] : d.meta.permissions.filter((x) => x !== p); })}
                />
                <span className="font-mono">{p}</span>
                {isAuto && <span className="ml-auto rounded bg-card-2 px-1.5">auto</span>}
              </label>
            );
          })}
        </div>
      </Section>
      <Section title="Notificaciones push (Firebase)">
        {!planAllows(planCode, "PRO") && <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">Disponible en el plan Profesional o superior.</p>}
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
          <span className="text-[13px] font-medium">Activar notificaciones push</span>
          <Toggle checked={config.integrations.push.enabled} onChange={(v) => update((d) => { d.integrations.push.enabled = v; })} />
        </label>
        {config.integrations.push.enabled && (
          <div className="flex flex-col gap-2 text-xs text-muted">
            <p>Crea un proyecto en Firebase, registra una app Android con el identificador <code className="font-mono text-fg">{m.packageName}</code> y sube aquí su <code>google-services.json</code>.</p>
            <label className="cursor-pointer rounded-xl border border-dashed border-line px-3 py-2.5 text-center hover:border-brand-500">
              {config.integrations.push.googleServicesKey ? "✓ google-services.json subido (pulsa para reemplazar)" : "Subir google-services.json"}
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadGoogleServices(e.target.files[0])} />
            </label>
          </div>
        )}
      </Section>
    </>
  );
}
