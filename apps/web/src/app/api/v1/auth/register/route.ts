import { route, body, ok, ApiError, rateLimit, ipOf } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { createSession, hashPassword, toSafeUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth-mail";
import { getSettings } from "@/lib/settings";

export const POST = route(async (req) => {
  rateLimit(`register:${ipOf(req)}`, 10, 60 * 60_000);
  if (!(await getSettings()).registrationOpen) throw new ApiError(403, "El registro de nuevas cuentas está cerrado temporalmente.");
  const data = await body(req, registerSchema);
  if (await db.user.findUnique({ where: { email: data.email } })) throw new ApiError(409, "Ya existe una cuenta con este email");
  const user = await db.user.create({ data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) } });
  await sendVerificationEmail(user);
  await createSession(user.id);
  return ok({ user: toSafeUser(user) }, 201);
});
