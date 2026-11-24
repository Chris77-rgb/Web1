import { Check } from "lucide-react";
import { FEATURE_LABELS, PLAN_FEATURES } from "@forjapp/shared";
import { requireUserPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { billingEnabled } from "@/lib/billing";
import { PageHeader, Badge } from "@/components/ui/card";
import { PlanButton } from "@/components/plan-button";
import { cn } from "@/lib/cn";

export const metadata = { title: "Plan y facturación" };

const fmt = (n: number, suffix = "") => (n < 0 ? "Ilimitado" : `${n.toLocaleString("es-ES")}${suffix}`);

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const user = await requireUserPage();
  const [plans, sub] = await Promise.all([db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), db.subscription.findUnique({ where: { userId: user.id } })]);
  const enabled = billingEnabled();
  const { success } = await searchParams;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Plan y facturación" description={enabled ? "Cambia de plan cuando quieras. Los pagos se gestionan de forma segura con Stripe." : "Los pagos aún no están activados: el administrador puede asignarte un plan manualmente."} />
      {success && <div className="mb-6 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">¡Pago completado! Tu plan se actualizará en unos segundos.</div>}
      {sub && <p className="mb-4 text-sm text-muted">Suscripción: <Badge tone={sub.status === "active" ? "green" : "amber"}>{sub.status}</Badge>{sub.currentPeriodEnd && ` · renovación el ${sub.currentPeriodEnd.toLocaleDateString("es-ES")}`}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const current = p.code === user.planCode;
          return (
            <div key={p.code} className={cn("flex flex-col rounded-2xl border bg-card p-6 shadow-sm", current ? "border-brand-500 ring-4 ring-brand-500/10" : "border-line", p.code === "PRO" && !current && "md:-translate-y-1")}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {current ? <Badge tone="brand">Tu plan</Badge> : p.code === "PRO" ? <Badge tone="amber">Popular</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted">{p.description}</p>
              <p className="mt-4"><span className="text-3xl font-bold">{(p.priceMonthlyCents / 100).toLocaleString("es-ES", { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: 0 })}</span><span className="text-sm text-muted"> /mes</span></p>
              <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
                <li className="flex gap-2"><Check className="size-4 shrink-0 text-brand-600" />{fmt(p.maxProjects)} apps</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0 text-brand-600" />{fmt(p.maxBuildsPerMonth)} compilaciones/mes</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0 text-brand-600" />{p.maxStorageMb >= 1024 ? fmt(p.maxStorageMb / 1024, " GB") : fmt(p.maxStorageMb, " MB")} de almacenamiento</li>
                <li className="flex gap-2"><Check className="size-4 shrink-0 text-brand-600" />{fmt(p.maxAiRequestsPerMonth)} peticiones de IA/mes</li>
                {PLAN_FEATURES.filter((f) => p.features.includes(f) && f !== "ai_assistant").map((f) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-brand-600" />{FEATURE_LABELS[f]}</li>)}
              </ul>
              <div className="mt-6"><PlanButton planCode={p.code} current={current} free={p.priceMonthlyCents === 0} enabled={enabled} hasSub={!!sub?.stripeSubscriptionId} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
