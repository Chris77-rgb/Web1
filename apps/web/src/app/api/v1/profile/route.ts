import { route, body, ok, requireUser } from "@/lib/api";
import { profileSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { toSafeUser } from "@/lib/auth";

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const data = await body(req, profileSchema);
  const updated = await db.user.update({ where: { id: user.id }, data: { name: data.name, avatarUrl: data.avatarUrl ?? null } });
  return ok({ user: toSafeUser(updated) });
});
