import { route, ok, requireUser } from "@/lib/api";
import { getPlan, getUsage } from "@/lib/limits";

export const GET = route(async () => {
  const user = await requireUser();
  const [plan, usage] = await Promise.all([getPlan(user.planCode), getUsage(user.id)]);
  return ok({ user, plan, usage });
});
