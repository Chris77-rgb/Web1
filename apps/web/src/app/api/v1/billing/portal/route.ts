import { route, ok, requireUser, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/billing";

export const POST = route(async () => {
  const user = await requireUser();
  const s = stripe();
  if (!s) throw new ApiError(503, "Los pagos no están activados.");
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!row.stripeCustomerId) throw new ApiError(404, "No tienes ninguna suscripción.");
  const portal = await s.billingPortal.sessions.create({ customer: row.stripeCustomerId, return_url: `${env.appUrl}/billing` });
  return ok({ url: portal.url });
});
