import { z } from "zod";
import { route, body, ok, requireUser, rateLimit } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { encrypt } from "@/lib/crypto";
import { AI_PROVIDERS, verifyKey, isAiProvider } from "@/lib/ai-providers";

/** Status of the user's own AI connection. The key itself is never returned. */
export const GET = route(async () => {
  const user = await requireUser();
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { aiProvider: true, aiKeyHint: true, aiModel: true } });
  const provider = isAiProvider(row.aiProvider) ? row.aiProvider : null;
  return ok({
    provider,
    keyHint: provider ? row.aiKeyHint : null,
    model: provider ? row.aiModel : null,
    platformAi: !!env.anthropicKey(),
    providers: Object.entries(AI_PROVIDERS).map(([id, p]) => ({ id, label: p.label, defaultModel: p.defaultModel, keyPlaceholder: p.keyPlaceholder, keyUrl: p.keyUrl })),
  });
});

const putSchema = z.object({
  provider: z.string().refine(isAiProvider, "Proveedor no soportado"),
  apiKey: z.string().trim().min(10, "La clave parece demasiado corta").max(300),
  model: z.string().trim().max(100).optional(),
});

/** Verifies the key with the provider, then stores it encrypted. */
export const PUT = route(async (req) => {
  const user = await requireUser();
  rateLimit(`ai-key:${user.id}`, 10, 60 * 60_000);
  const data = await body(req, putSchema);
  const provider = data.provider as keyof typeof AI_PROVIDERS;
  const model = data.model || AI_PROVIDERS[provider].defaultModel;
  await verifyKey(provider, data.apiKey);
  await db.user.update({
    where: { id: user.id },
    data: { aiProvider: provider, aiApiKeyEnc: encrypt(data.apiKey), aiKeyHint: data.apiKey.slice(-4), aiModel: model },
  });
  return ok({ ok: true });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { aiProvider: null, aiApiKeyEnc: null, aiKeyHint: null, aiModel: null } });
  return ok({ ok: true });
});
