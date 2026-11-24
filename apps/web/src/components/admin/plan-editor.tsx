"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEATURE_LABELS, PLAN_FEATURES } from "@forjapp/shared";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Toggle } from "@/components/editor/fields";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

interface Plan {
  code: string; name: string; description: string; priceMonthlyCents: number; maxProjects: number; maxBuildsPerMonth: number;
  maxStorageMb: number; maxAiRequestsPerMonth: number; features: string[]; stripePriceId: string | null; active: boolean;
}

export function PlanEditor({ plan, users }: { plan: Plan; users: number }) {
  const [p, setP] = useState(plan);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const num = (k: keyof Plan) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Math.trunc(Number(e.target.value)) });
  const { code, ...payload } = p;
  return (
    <Card>
      <CardHeader title={`${p.name} (${code})`} description={`${users} usuarios`} action={<div className="flex items-center gap-2 text-sm">Activo <Toggle checked={p.active} onChange={(v) => setP({ ...p, active: v })} /></div>} />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nombre"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Precio mensual (céntimos)"><Input type="number" min={0} value={p.priceMonthlyCents} onChange={num("priceMonthlyCents")} /></Field>
        <Field label="Descripción" className="sm:col-span-2"><Input value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
        <Field label="Máx. proyectos"><Input type="number" min={-1} value={p.maxProjects} onChange={num("maxProjects")} /></Field>
        <Field label="Compilaciones / mes"><Input type="number" min={-1} value={p.maxBuildsPerMonth} onChange={num("maxBuildsPerMonth")} /></Field>
        <Field label="Almacenamiento (MB)"><Input type="number" min={-1} value={p.maxStorageMb} onChange={num("maxStorageMb")} /></Field>
        <Field label="Peticiones IA / mes"><Input type="number" min={-1} value={p.maxAiRequestsPerMonth} onChange={num("maxAiRequestsPerMonth")} /></Field>
        <Field label="Stripe price ID" hint="price_… (necesario para cobrar este plan)" className="sm:col-span-2"><Input value={p.stripePriceId ?? ""} onChange={(e) => setP({ ...p, stripePriceId: e.target.value || null })} placeholder="price_123" /></Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-[13px] font-medium">Funciones</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {PLAN_FEATURES.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-brand-600" checked={p.features.includes(f)} onChange={(e) => setP({ ...p, features: e.target.checked ? [...p.features, f] : p.features.filter((x) => x !== f) })} />
                {FEATURE_LABELS[f]}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button loading={busy} onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/v1/admin/plans/${code}`, { method: "PUT", body: payload });
              toast("Plan guardado", "success");
              router.refresh();
            } catch (e) {
              toast((e as Error).message, "error");
            } finally {
              setBusy(false);
            }
          }}>Guardar plan</Button>
        </div>
      </div>
    </Card>
  );
}
