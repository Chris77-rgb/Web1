import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Configuración · Admin" };

export default async function AdminSettings() {
  const settings = await getSettings();
  const integrations = [
    ["Email (SMTP)", !!env.smtpUrl()],
    ["Asistente IA (Anthropic)", !!env.anthropicKey()],
    ["Pagos (Stripe)", !!env.stripeKey()],
    ["Webhook de Stripe", !!env.stripeWebhookSecret()],
  ] as const;
  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader title="Configuración" description="Ajustes generales de la plataforma." />
      <SettingsForm initial={settings} />
      <Card className="mt-6">
        <CardHeader title="Integraciones" description="Se configuran con variables de entorno en el servidor (ver .env.example)." />
        <ul className="divide-y divide-line">{integrations.map(([label, on]) => <li key={label} className="flex items-center justify-between px-5 py-3 text-sm">{label}{on ? <Badge tone="green">Configurado</Badge> : <Badge>No configurado</Badge>}</li>)}</ul>
      </Card>
    </div>
  );
}
