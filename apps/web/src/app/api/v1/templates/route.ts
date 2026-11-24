import { route, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  const templates = await db.template.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return ok({ templates });
});
