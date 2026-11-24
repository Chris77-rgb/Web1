import { route, body, ok, ApiError, rateLimit, ipOf } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { createSession, hashPassword, toSafeUser, verifyPassword } from "@/lib/auth";

// Always run bcrypt, even for unknown emails, so response time does not reveal which emails exist.
let dummyHash: Promise<string> | null = null;

export const POST = route(async (req) => {
  const data = await body(req, loginSchema);
  rateLimit(`login:${ipOf(req)}`, 20, 15 * 60_000);
  rateLimit(`login:${data.email}`, 8, 15 * 60_000);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(data.password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("not-a-real-password-1"))));
  if (!user || !valid) throw new ApiError(401, "Email o contraseña incorrectos");
  if (user.disabled) throw new ApiError(403, "Esta cuenta está desactivada. Contacta con soporte.");
  await createSession(user.id);
  return ok({ user: toSafeUser(user) });
});
