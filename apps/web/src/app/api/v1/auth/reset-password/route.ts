import { route, body, ok, ApiError, rateLimit, ipOf } from "@/lib/api";
import { resetSchema } from "@/lib/validators";
import { consumeToken, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = route(async (req) => {
  rateLimit(`reset:${ipOf(req)}`, 10, 15 * 60_000);
  const { token, password } = await body(req, resetSchema);
  const userId = await consumeToken(token, "PASSWORD_RESET");
  if (!userId) throw new ApiError(400, "El enlace no es válido o ha caducado");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } }),
    db.session.deleteMany({ where: { userId } }), // log out everywhere
  ]);
  return ok({ ok: true });
});
