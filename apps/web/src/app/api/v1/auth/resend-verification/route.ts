import { route, ok, requireUser, rateLimit } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/auth-mail";

export const POST = route(async () => {
  const user = await requireUser();
  rateLimit(`resend:${user.id}`, 3, 60 * 60_000);
  if (!user.emailVerifiedAt) await sendVerificationEmail(user);
  return ok({ ok: true });
});
