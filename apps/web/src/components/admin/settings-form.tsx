"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Toggle } from "@/components/editor/fields";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <Card>
      <CardHeader title="General" />
      <div className="flex flex-col gap-4 p-5">
        <Field label="Nombre de la plataforma"><Input value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} maxLength={60} /></Field>
        <Field label="Email de soporte"><Input type="email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /></Field>
        <Field label="Publicidad de Forjapp (% de visitantes)" hint="Si el creador pone su propio anuncio, este porcentaje de visitantes verá los anuncios de Forjapp. Sin anuncio propio, Forjapp muestra los suyos al 100 %."><Input type="number" min={0} max={100} value={s.adSharePercent} onChange={(e) => setS({ ...s, adSharePercent: Math.min(100, Math.max(0, Math.trunc(Number(e.target.value) || 0))) })} /></Field>
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium">Registro de nuevos usuarios abierto <Toggle checked={s.registrationOpen} onChange={(v) => setS({ ...s, registrationOpen: v })} /></label>
        <Field label="Aviso global" hint="Se muestra a todos los usuarios en el panel. Déjalo vacío para ocultarlo."><Textarea value={s.maintenanceMessage} onChange={(e) => setS({ ...s, maintenanceMessage: e.target.value })} maxLength={300} rows={2} /></Field>
        <div><Button loading={busy} onClick={async () => {
          setBusy(true);
          try { await api("/api/v1/admin/settings", { method: "PUT", body: s }); toast("Configuración guardada", "success"); router.refresh(); }
          catch (e) { toast((e as Error).message, "error"); }
          finally { setBusy(false); }
        }}>Guardar</Button></div>
      </div>
    </Card>
  );
}
