import { cookies } from "next/headers";
import { route, body, ok, requireUser, ApiError } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";

export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await body(req, changePasswordSchema);
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(data.currentPassword, row.passwordHash))) throw new ApiError(400, "La contraseña actual no es correcta");
  const current = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } }),
    // Close every other session, keep this one.
    db.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: sha256(current) } } }),
  ]);
  return ok({ ok: true });
});
