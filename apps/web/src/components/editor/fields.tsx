"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { FieldDef, Page } from "@forjapp/shared";
import { ICON_NAMES } from "@forjapp/shared";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { upload } from "@/lib/client";
import { cn } from "@/lib/cn";

export interface FieldCtx {
  projectId: string;
  pages: Page[];
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  // Follow external changes (undo, AI edits) unless the user is mid-typing an invalid value.
  useEffect(() => setText((t) => (/^#[0-9a-fA-F]{6}$/.test(t) || t === "" ? value : t)), [value]);
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => { setText(e.target.value.toUpperCase()); onChange(e.target.value.toUpperCase()); }} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <Input
        data-color="1"
        value={text}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
        }}
        onBlur={() => setText(value)}
        className="font-mono uppercase"
      />
    </div>
  );
}

export function ImageInput({ value, onChange, projectId }: { value: string; onChange: (v: string) => void; projectId: string }) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await upload(file, projectId);
      if (res.url) onChange(res.url);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-card-2 transition hover:border-brand-500"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-lg bg-black/60 p-1 text-white" aria-label="Quitar imagen"><X className="size-4" /></button>
          </>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="flex flex-col items-center gap-1 text-xs text-muted">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {busy ? "Subiendo…" : "Arrastra o pulsa para subir (máx. 5 MB)"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…o pega una URL https://" className="text-xs" />
    </div>
  );
}

export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {ICON_NAMES.map((i) => <option key={i} value={i}>{i}</option>)}
    </Select>
  );
}

export function FieldInput({ def, value, onChange, ctx }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; ctx: FieldCtx }) {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  let control: React.ReactNode;
  switch (def.type) {
    case "textarea":
      control = <Textarea value={s} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={5000} />;
      break;
    case "number":
      control = <Input type="number" value={s} min={def.min} max={def.max} step="any" onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />;
      break;
    case "color":
      control = <ColorInput value={s || "#000000"} onChange={onChange} />;
      break;
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
          <span className="text-[13px] font-medium">{def.label}</span>
          <Toggle checked={!!value} onChange={onChange} />
        </label>
      );
    case "select":
      control = (
        <Select value={s} onChange={(e) => onChange(e.target.value)}>
          {def.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
      break;
    case "page":
      control = (
        <Select value={s} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Ninguna —</option>
          {ctx.pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
      );
      break;
    case "image":
      control = <ImageInput value={s} onChange={onChange} projectId={ctx.projectId} />;
      break;
    case "list":
      return <ListInput def={def} value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} onChange={onChange} ctx={ctx} />;
    case "url":
      control = <Input type="url" value={s} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder ?? "https://"} maxLength={1000} />;
      break;
    default:
      control = <Input value={s} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} maxLength={500} />;
  }
  return <Field label={`${def.label}${def.required ? " *" : ""}`} hint={def.help}>{control}</Field>;
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-line")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function ListInput({ def, value, onChange, ctx }: { def: FieldDef; value: Record<string, unknown>[]; onChange: (v: unknown) => void; ctx: FieldCtx }) {
  const [open, setOpen] = useState<number | null>(value.length ? 0 : null);
  const fields = def.itemFields ?? [];
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === "boolean" ? false : f.type === "select" ? (f.options?.[0]?.value ?? "") : ""]));
  const set = (i: number, k: string, v: unknown) => onChange(value.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
    setOpen(j);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{def.label}</span>
        <span className="text-xs text-muted">{value.length}</span>
      </div>
      {value.map((item, i) => {
        const title = String(item[def.itemLabel ?? ""] ?? "") || `Elemento ${i + 1}`;
        return (
          <div key={i} className="rounded-xl border border-line">
            <div className="flex items-center gap-1 px-3 py-2">
              <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => setOpen(open === i ? null : i)}>{title}</button>
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-card-2" aria-label="Subir"><ChevronUp className="size-4" /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-card-2" aria-label="Bajar"><ChevronDown className="size-4" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1 text-red-500 hover:bg-red-500/10" aria-label="Eliminar"><Trash2 className="size-4" /></button>
            </div>
            {open === i && (
              <div className="flex flex-col gap-3 border-t border-line p-3">
                {fields.map((f) => <FieldInput key={f.key} def={f} value={item[f.key]} onChange={(v) => set(i, f.key, v)} ctx={ctx} />)}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => { onChange([...value, blank()]); setOpen(value.length); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm text-muted transition hover:border-brand-500 hover:text-fg">
        <Plus className="size-4" />Añadir
      </button>
    </div>
  );
}
