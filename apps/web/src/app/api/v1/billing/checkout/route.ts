import { z } from "zod";
import { route, body, ok, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/billing";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { planCode } = await body(req, z.object({ planCode: z.string().max(40) }));
  const s = stripe();
  if (!s) throw new ApiError(503, "Los pagos todavía no están activados en esta plataforma. Contacta con el administrador para cambiar de plan.");
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) throw new ApiError(404, "Plan no encontrado");
  if (!plan.stripePriceId) throw new ApiError(503, `El plan ${plan.name} no tiene precio configurado en Stripe.`);

  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  let customer = row.stripeCustomerId;
  if (!customer) {
    customer = (await s.customers.create({ email: row.email, name: row.name, metadata: { userId: row.id } })).id;
    await db.user.update({ where: { id: row.id }, data: { stripeCustomerId: customer } });
  }
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: { metadata: { userId: row.id } },
    success_url: `${env.appUrl}/billing?success=1`,
    cancel_url: `${env.appUrl}/billing?canceled=1`,
    allow_promotion_codes: true,
  });
  return ok({ url: session.url });
});
