import { z } from "zod";
import { route, body, ok, requireUser, rateLimit, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { decrypt } from "@/lib/crypto";
import { assertAi, assertAiFeature } from "@/lib/limits";
import { parseConfig } from "@/lib/projects";
import { generateWithClaude, generateWithRules, generateWithUserKey } from "@/lib/ai";
import { AI_PROVIDERS, isAiProvider, type AiProvider } from "@/lib/ai-providers";
import type { AppConfig } from "@forjapp/shared";

export const maxDuration = 300;

const schema = z.object({
  prompt: z.string().trim().min(5, "Describe tu app con más detalle").max(2000),
  name: z.string().trim().max(50).optional(),
  /** When present, the AI edits this config instead of creating a new app. */
  current: z.unknown().optional(),
});

/**
 * Picks the AI in this order:
 *  1. The user's own provider + key (Perfil → Inteligencia artificial). No platform quota applies.
 *  2. The platform's Claude key, if the operator configured one (counts toward the plan quota).
 *  3. The offline rule-based generator (creation only).
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`ai:${user.id}`, 10, 60_000);
  const data = await body(req, schema);
  const current = data.current ? parseConfig(data.current) as AppConfig : undefined;

  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { aiProvider: true, aiApiKeyEnc: true, aiModel: true } });
  const own =
    isAiProvider(row.aiProvider) && row.aiApiKeyEnc
      ? { provider: row.aiProvider as AiProvider, apiKey: decrypt(row.aiApiKeyEnc), model: row.aiModel || AI_PROVIDERS[row.aiProvider].defaultModel }
      : null;
  const platform = !own && !!env.anthropicKey();

  if (own) await assertAiFeature(user.planCode);
  else if (platform) await assertAi(user.id, user.planCode);
  else if (current) throw new ApiError(400, "Conecta tu IA en Perfil → Inteligencia artificial para editar tus apps.");

  const opts = { name: data.name, current };
  let result: { config: AppConfig; summary: string } | undefined;
  const modelUsed = own ? `${own.provider}:${own.model}` : platform ? env.aiModel() : "rules";
  try {
    result = own
      ? await generateWithUserKey(own, data.prompt, opts)
      : platform
        ? await generateWithClaude(data.prompt, opts)
        : generateWithRules(data.prompt, opts);
  } finally {
    await db.aiRequest.create({ data: { userId: user.id, prompt: data.prompt.slice(0, 2000), model: modelUsed, ok: !!result } });
  }
  return ok({ ...result, source: own ? own.provider : platform ? "claude" : "rules" });
});
