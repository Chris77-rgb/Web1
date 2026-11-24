import { route, body, ok, rateLimit, ipOf } from "@/lib/api";
import { forgotSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { sendResetEmail } from "@/lib/auth-mail";

/** Always answers 200 so it can't be used to discover registered emails. */
export const POST = route(async (req) => {
  rateLimit(`forgot:${ipOf(req)}`, 5, 15 * 60_000);
  const { email } = await body(req, forgotSchema);
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.disabled) await sendResetEmail(user);
  return ok({ ok: true });
});
