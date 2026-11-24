"use client";
import { useEffect, useState } from "react";
import { Plug, Unplug, ShieldCheck } from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

interface Status {
  provider: string | null;
  keyHint: string | null;
  model: string | null;
  platformAi: boolean;
  providers: { id: string; label: string; defaultModel: string; keyPlaceholder: string; keyUrl: string }[];
}

export function ProfileAi() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api<Status>("/api/v1/profile/ai").then((s) => {
    setStatus(s);
    setProvider(s.provider ?? "");
    setModel(s.model ?? "");
  });
  useEffect(() => {
    load().catch((e) => toast((e as Error).message, "error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = status?.providers.find((p) => p.id === provider);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/profile/ai", { method: "PUT", body: { provider, apiKey, model: model || undefined } });
      setApiKey("");
      toast("Clave verificada y guardada", "success");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api("/api/v1/profile/ai", { method: "DELETE" });
      toast("IA desconectada", "success");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Inteligencia artificial"
        description="Conecta tu propia cuenta de Claude, ChatGPT o Gemini. Las peticiones se cobran en tu cuenta del proveedor, no en la de Forjapp."
        action={status?.provider ? <Badge tone="green">Conectado</Badge> : undefined}
      />
      <div className="flex flex-col gap-4 p-5">
        {status?.provider && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">{status.providers.find((p) => p.id === status.provider)?.label} · {status.model}</p>
              <p className="text-muted">Clave guardada cifrada, terminada en {status.keyHint}</p>
            </div>
          </div>
        )}
        {!status?.provider && (
          <p className="text-sm text-muted">
            {status?.platformAi
              ? "Ahora mismo usas la IA de Forjapp, que cuenta en tu cuota mensual del plan."
              : "Sin IA conectada se usará un generador básico que no personaliza el contenido."}
          </p>
        )}

        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Proveedor">
            <Select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); }} required>
              <option value="" disabled>Elige un proveedor…</option>
              {status?.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          {provider && (
            <>
              <Field label="Clave de API" hint={`Consíguela en ${selected?.keyUrl ?? ""}. Se verifica antes de guardarla.`}>
                <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={selected?.keyPlaceholder} required minLength={10} maxLength={300} />
              </Field>
              <Field label="Modelo" hint={`Por defecto: ${selected?.defaultModel}. Cámbialo si tu cuenta usa otro.`}>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={selected?.defaultModel} maxLength={100} />
              </Field>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy} disabled={!provider || apiKey.length < 10}><Plug className="size-4" />Verificar y guardar</Button>
            {status?.provider && <Button type="button" variant="outline" onClick={disconnect} disabled={busy}><Unplug className="size-4" />Desconectar</Button>}
          </div>
        </form>
      </div>
    </Card>
  );
}
