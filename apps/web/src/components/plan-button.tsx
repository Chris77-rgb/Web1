"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function PlanButton({ planCode, current, free, enabled, hasSub }: { planCode: string; current: boolean; free: boolean; enabled: boolean; hasSub: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (current) return <Button variant="secondary" className="w-full" disabled>Plan actual</Button>;
  const go = async () => {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>(hasSub || free ? "/api/v1/billing/portal" : "/api/v1/billing/checkout", { body: { planCode } });
      location.href = url;
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };
  return <Button variant={free ? "outline" : "primary"} className="w-full" onClick={go} loading={busy} disabled={!enabled && !free}>{free ? "Cambiar a gratis" : enabled ? "Elegir plan" : "Próximamente"}</Button>;
}
