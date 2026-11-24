import { db } from "@/lib/db";
import { billingEnabled } from "@/lib/billing";
import { PageHeader } from "@/components/ui/card";
import { PlanEditor } from "@/components/admin/plan-editor";

export const metadata = { title: "Planes · Admin" };

export default async function AdminPlans() {
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { users: true } } } });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Planes" description={`Límites y funciones de cada plan. Usa -1 para ilimitado. Stripe: ${billingEnabled() ? "activado" : "desactivado (configura STRIPE_SECRET_KEY)"}.`} />
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map(({ _count, updatedAt, ...p }) => <PlanEditor key={p.code} plan={p} users={_count.users} />)}
      </div>
    </div>
  );
}
