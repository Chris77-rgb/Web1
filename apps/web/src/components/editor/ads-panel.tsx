"use client";
import { Info, Megaphone, ShieldOff } from "lucide-react";
import type { AppConfig } from "@forjapp/shared";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageInput, Toggle, type FieldCtx } from "./fields";
import { Section, type Update } from "./panels";

export const ADFREE_FREE_VISITORS = 1000;

/** Creator's own ad + explanation of Forjapp's share and the per-app Adfree service. */
export function AdsPanel({ config, update, ctx, sharePercent, adfreeUntil }: { config: AppConfig; update: Update; ctx: FieldCtx; sharePercent: number; adfreeUntil: string | null }) {
  const ads = config.ads;
  const adfreeActive = !!adfreeUntil && new Date(adfreeUntil) > new Date();
  return (
    <>
      <Section title="Tu anuncio">
        <p className="-mt-1 text-xs text-muted">Un banner propio (por ejemplo, tu tienda u otra web). Se muestra en todas las páginas de tu app.</p>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
          <span className="flex items-center gap-2 text-[13px] font-medium"><Megaphone className="size-4" />Mostrar mi anuncio</span>
          <Toggle checked={ads.enabled} onChange={(v) => update((d) => { d.ads.enabled = v; })} />
        </label>
        {ads.enabled && (
          <>
            <Field label="Imagen del banner" hint="Recomendado 728×90 o 320×50 px.">
              <ImageInput value={ads.imageUrl} projectId={ctx.projectId} onChange={(v) => update((d) => { d.ads.imageUrl = v; })} />
            </Field>
            <Field label="Enlace al pulsar" hint="Debe empezar por https://">
              <Input type="url" value={ads.linkUrl} maxLength={500} placeholder="https://" onChange={(e) => update((d) => { d.ads.linkUrl = e.target.value; })} />
            </Field>
            <Field label="Texto (opcional)">
              <Input value={ads.label} maxLength={60} onChange={(e) => update((d) => { d.ads.label = e.target.value; })} />
            </Field>
            <Field label="Posición">
              <Select value={ads.position} onChange={(e) => update((d) => { d.ads.position = e.target.value as "top" | "bottom"; })}>
                <option value="bottom">Abajo</option>
                <option value="top">Arriba</option>
              </Select>
            </Field>
            {(!ads.imageUrl || !ads.linkUrl) && <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">Falta la imagen o el enlace: tu anuncio no se mostrará hasta completarlos.</p>}
          </>
        )}
      </Section>

      <Section title="Publicidad de Forjapp">
        <div className="flex gap-2 rounded-xl bg-brand-500/5 p-3 text-xs text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p>
            Forjapp es gratuito gracias a su publicidad.{" "}
            {ads.enabled && ads.imageUrl && ads.linkUrl
              ? <>Como tienes tu propio anuncio, Forjapp muestra la suya a <strong className="text-fg">{sharePercent} %</strong> de los visitantes; el resto ve la tuya.</>
              : <>Sin un anuncio propio, Forjapp muestra su publicidad al <strong className="text-fg">100 %</strong> de los visitantes. Pon el tuyo para reducirla al {sharePercent} %.</>}
          </p>
        </div>
      </Section>

      <Section title="Servicio Adfree">
        <div className="flex gap-2 rounded-xl border border-line p-3 text-xs text-muted">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p>
            Con el servicio Adfree activo, Forjapp <strong className="text-fg">no muestra ningún anuncio a los {ADFREE_FREE_VISITORS.toLocaleString("es-ES")} primeros visitantes de cada día</strong> de esta app. Se contrata por app.
          </p>
        </div>
        {adfreeActive ? (
          <p className="rounded-lg bg-emerald-500/10 p-2 text-sm text-emerald-700 dark:text-emerald-400">Adfree activo hasta el {new Date(adfreeUntil!).toLocaleDateString("es-ES", { dateStyle: "long" })}.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Tu servicio Adfree no está activo.</p>
            <Button variant="outline" size="sm" disabled title="La contratación online todavía no está disponible">Contratar Adfree (próximamente)</Button>
          </>
        )}
      </Section>
    </>
  );
}
