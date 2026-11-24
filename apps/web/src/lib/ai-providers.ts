/**
 * Provider adapters for the user's own AI account (BYOK).
 * Each provider is called through its official SDK with the user's key.
 * Keys are only decrypted server-side, right before a request, and never logged.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { ApiError } from "./api";

export const AI_PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)",
    defaultModel: "claude-opus-5-5",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "ChatGPT (OpenAI)",
    defaultModel: "gpt-4o",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  google: {
    label: "Gemini (Google)",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;
export const isAiProvider = (v: unknown): v is AiProvider => typeof v === "string" && Object.hasOwn(AI_PROVIDERS, v);

/** Makes one cheap call that proves the key works. Never includes the key in errors. */
export async function verifyKey(provider: AiProvider, apiKey: string): Promise<void> {
  try {
    if (provider === "anthropic") {
      await new Anthropic({ apiKey, maxRetries: 0 }).models.list({ limit: 1 });
    } else if (provider === "openai") {
      await new OpenAI({ apiKey, maxRetries: 0 }).models.list();
    } else {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(apiKey)}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw Object.assign(new Error("google"), { status: res.status });
    }
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403 || status === 400) throw new ApiError(400, `La clave de ${AI_PROVIDERS[provider].label} no es válida o no tiene acceso.`);
    if (status === 429) throw new ApiError(400, `La cuenta de ${AI_PROVIDERS[provider].label} está sin cuota disponible en este momento.`);
    throw new ApiError(502, `No se pudo contactar con ${AI_PROVIDERS[provider].label} para verificar la clave. Inténtalo de nuevo.`);
  }
}

/** Sends a system + user prompt and returns the model's text. */
async function complete(provider: AiProvider, apiKey: string, model: string, system: string, user: string): Promise<string> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }
  if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message.content ?? "";
  }
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model,
    contents: user,
    config: { systemInstruction: system, responseMimeType: "application/json" },
  });
  return res.text ?? "";
}

/** Extracts the JSON object from a model reply (tolerates code fences or stray text). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}

export async function completeJson(provider: AiProvider, apiKey: string, model: string, system: string, user: string): Promise<unknown> {
  let text: string;
  try {
    text = await complete(provider, apiKey, model, system, user);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) throw new ApiError(400, `Tu clave de ${AI_PROVIDERS[provider].label} no es válida o ha caducado. Actualízala en Perfil.`);
    if (status === 429) throw new ApiError(429, `Tu cuenta de ${AI_PROVIDERS[provider].label} ha alcanzado su límite. Inténtalo más tarde.`);
    if (status === 404) throw new ApiError(400, `El modelo «${model}» no está disponible con tu cuenta de ${AI_PROVIDERS[provider].label}. Cámbialo en Perfil.`);
    throw new ApiError(502, `Error de ${AI_PROVIDERS[provider].label}. Inténtalo de nuevo.`);
  }
  try {
    return extractJson(text);
  } catch {
    throw new ApiError(502, "La IA no devolvió una estructura válida. Inténtalo de nuevo.");
  }
}
