import { z } from "zod";
import { route, body, ok, requireUser, rateLimit, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { assertAi } from "@/lib/limits";
import { parseConfig } from "@/lib/projects";
import { generateWithClaude, generateWithRules } from "@/lib/ai";

export const maxDuration = 300;

const schema = z.object({
  prompt: z.string().trim().min(5, "Describe tu app con más detalle").max(2000),
  name: z.string().trim().max(50).optional(),
  /** When present, the AI edits this config instead of creating a new app. */
  current: z.unknown().optional(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`ai:${user.id}`, 10, 60_000);
  const data = await body(req, schema);
  await assertAi(user.id, user.planCode);
  const current = data.current ? parseConfig(data.current) : undefined;

  const useClaude = !!env.anthropicKey();
  if (!useClaude && current) throw new ApiError(503, "La edición con IA necesita configurar ANTHROPIC_API_KEY en el servidor.");

  let result;
  try {
    result = useClaude ? await generateWithClaude(data.prompt, { name: data.name, current }) : generateWithRules(data.prompt, { name: data.name });
  } finally {
    // Count every attempt (also failed ones) toward the monthly AI quota.
    await db.aiRequest.create({ data: { userId: user.id, prompt: data.prompt.slice(0, 2000), model: useClaude ? env.aiModel() : "rules", ok: !!result } });
  }
  return ok({ ...result, source: useClaude ? "claude" : "rules" });
});
