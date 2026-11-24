/**
 * Stripe integration. Disabled (no charges, no API calls) until STRIPE_SECRET_KEY is set
 * and each paid plan has a `stripePriceId` configured from the admin panel.
 */
import "server-only";
import Stripe from "stripe";
import { env } from "./env";
import { db } from "./db";

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  if (!env.stripeKey()) return null;
  client ??= new Stripe(env.stripeKey());
  return client;
}
export const billingEnabled = () => !!env.stripeKey();

/** Applies a Stripe subscription state to our user/plan tables. Idempotent. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  const priceId = sub.items.data[0]?.price.id;
  if (!userId || !priceId) return;
  const plan = await db.plan.findFirst({ where: { stripePriceId: priceId } });
  if (!plan) return;
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const periodEnd = sub.current_period_end;
  await db.$transaction([
    db.subscription.upsert({
      where: { userId },
      create: { userId, planCode: plan.code, status: sub.status, stripeSubscriptionId: sub.id, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null },
      update: { planCode: plan.code, status: sub.status, stripeSubscriptionId: sub.id, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null },
    }),
    db.user.update({ where: { id: userId }, data: { planCode: active ? plan.code : "FREE" } }),
  ]);
}
