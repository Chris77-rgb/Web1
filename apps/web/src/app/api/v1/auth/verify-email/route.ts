import { route, body, ok, ApiError } from "@/lib/api";
import { tokenSchema } from "@/lib/validators";
import { consumeToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = route(async (req) => {
  const { token } = await body(req, tokenSchema);
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (!userId) throw new ApiError(400, "El enlace de verificación no es válido o ha caducado");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return ok({ ok: true });
});
