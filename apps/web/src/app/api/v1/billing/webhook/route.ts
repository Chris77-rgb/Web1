import type Stripe from "stripe";
import { env } from "@/lib/env";
import { stripe, syncSubscription } from "@/lib/billing";

/** Stripe webhook. Configure it in Stripe pointing to /api/v1/billing/webhook. */
export async function POST(req: Request) {
  const s = stripe();
  if (!s || !env.stripeWebhookSecret()) return new Response("Billing disabled", { status: 503 });
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), sig, env.stripeWebhookSecret());
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const sub = event.data.object.subscription;
      if (typeof sub === "string") await syncSubscription(await s.subscriptions.retrieve(sub));
      break;
    }
  }
  return Response.json({ received: true });
}
