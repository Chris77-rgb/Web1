/**
 * AI app generator.
 *
 * Claude returns a "blueprint" (a compact, strictly-typed description of the app) via
 * structured outputs; we convert it into a full AppConfig and validate it with the same
 * schema as the editor. Without ANTHROPIC_API_KEY a rule-based generator is used so the
 * feature still works in development.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import {
  FONTS, ICON_NAMES, MODULES, MODULE_MAP, SCHEMA_VERSION, TEMPLATE_MAP, newId, validateAppConfig,
  type AppConfig, type Block, type FieldDef,
} from "@forjapp/shared";
import { env } from "./env";
import { ApiError } from "./api";
import { AI_PROVIDERS, completeJson, type AiProvider } from "./ai-providers";

const hex = z.string().describe("Color hexadecimal #RRGGBB");
const kv = z.object({ key: z.string(), value: z.string() });

const BlueprintSchema = z.object({
  summary: z.string().describe("Explicación breve en español para el usuario de lo que has creado o cambiado (2-5 frases)."),
  appName: z.string(),
  description: z.string(),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    primary: hex,
    secondary: hex,
    background: hex,
    surface: hex,
    text: hex,
    font: z.enum(FONTS),
  }),
  navigation: z.enum(["bottom", "drawer", "none"]),
  pages: z.array(
    z.object({
      title: z.string(),
      icon: z.enum(ICON_NAMES),
      hideHeader: z.boolean(),
      blocks: z.array(
        z.object({
          type: z.enum(MODULES.map((m) => m.type) as [string, ...string[]]),
          fields: z.array(kv).describe("Valores de los campos simples del módulo (key = nombre del campo)."),
          items: z.array(z.array(kv)).describe("Elementos del campo de tipo lista del módulo, si lo tiene; si no, []."),
        }),
      ),
    }),
  ),
});
type Blueprint = z.infer<typeof BlueprintSchema>;
const BLUEPRINT_JSON_SCHEMA = JSON.stringify(z.toJSONSchema(BlueprintSchema));

function moduleCatalog(): string {
  const fieldDesc = (f: FieldDef) => `${f.key}:${f.type}${f.options ? `(${f.options.map((o) => o.value).join("|")})` : ""}`;
  return MODULES.map((m) => {
    const simple = m.fields.filter((f) => f.type !== "list").map(fieldDesc).join(", ");
    const list = m.fields.find((f) => f.type === "list");
    return `- ${m.type}: ${m.description} Campos: ${simple || "ninguno"}${list ? `. Lista "${list.key}" con elementos {${list.itemFields!.map(fieldDesc).join(", ")}}` : ""}`;
  }).join("\n");
}

const SYSTEM = `Eres el diseñador de apps de Forjapp, una plataforma no-code que genera aplicaciones Android.
Tu trabajo es convertir la descripción del usuario en la estructura de una app móvil completa, útil y bonita.

Reglas:
- Escribe todos los textos visibles en el idioma del usuario (español por defecto), con contenido realista y concreto, nunca "lorem ipsum".
- Crea entre 2 y 6 páginas. La primera página es la de inicio. Usa la navegación "bottom" para 2-5 páginas, "drawer" para más, "none" para una sola.
- Usa solo los módulos del catálogo y solo sus campos. Los valores de los campos van siempre como texto ("true"/"false" para booleanos, números como texto).
- Para campos "page" usa el título exacto de la página destino.
- Para imágenes usa URLs https://picsum.photos/seed/<palabra>/800/500 salvo que el usuario dé URLs. Para vídeos de ejemplo usa https://www.youtube.com/watch?v=aqz-KE-bpKQ. Para RSS usa feeds reales y públicos.
- Elige colores con buen contraste y coherentes con el sector. En modo oscuro el fondo debe ser oscuro y el texto claro.
- No inventes teléfonos, direcciones ni emails reales: si el usuario no los da, usa ejemplos claramente ficticios (+34 600 000 000, info@ejemplo.com).

Catálogo de módulos:
${moduleCatalog()}`;

// ------------------------------------------------------------------ conversion
function coerce(def: FieldDef | undefined, value: string): unknown {
  if (!def) return value;
  if (def.type === "number") return Number.isFinite(Number(value)) ? Number(value) : 0;
  if (def.type === "boolean") return value === "true";
  return value;
}

function blueprintToConfig(bp: Blueprint, current?: AppConfig): AppConfig {
  const pages = bp.pages.slice(0, 12).map((p) => ({ id: newId("page"), title: p.title.slice(0, 60) || "Página", icon: p.icon, hideHeader: p.hideHeader, bp: p }));
  const byTitle = new Map(pages.map((p) => [p.title.toLowerCase(), p.id]));

  const outPages = pages.map(({ bp: p, ...page }) => ({
    ...page,
    blocks: p.blocks.slice(0, 30).flatMap((b): Block[] => {
      const def = MODULE_MAP[b.type];
      if (!def) return [];
      const props: Record<string, unknown> = structuredClone(def.defaultProps);
      for (const { key, value } of b.fields) {
        const f = def.fields.find((x) => x.key === key && x.type !== "list");
        if (!f) continue;
        props[key] = f.type === "page" ? (byTitle.get(value.toLowerCase()) ?? "") : coerce(f, value);
      }
      const listDef = def.fields.find((f) => f.type === "list");
      if (listDef && b.items.length) {
        props[listDef.key] = b.items.slice(0, 50).map((item) => {
          const o: Record<string, unknown> = {};
          for (const f of listDef.itemFields ?? []) o[f.key] = f.type === "boolean" ? false : "";
          for (const { key, value } of item) {
            const f = listDef.itemFields?.find((x) => x.key === key);
            if (f) o[key] = coerce(f, value);
          }
          return o;
        });
      }
      return [{ id: newId("b"), type: b.type, props }];
    }),
  }));
  if (!outPages.length) outPages.push({ id: newId("page"), title: "Inicio", icon: "home", hideHeader: false, blocks: [] });

  const cfg: AppConfig = {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: bp.appName.slice(0, 50) || current?.meta.name || "Mi App",
      description: bp.description.slice(0, 500),
      packageName: current?.meta.packageName ?? "com.forjapp.miapp",
      versionCode: current?.meta.versionCode ?? 1,
      versionName: current?.meta.versionName ?? "1.0.0",
      orientation: current?.meta.orientation ?? "portrait",
      permissions: current?.meta.permissions ?? [],
    },
    theme: { ...bp.theme, radius: current?.theme.radius ?? 14 },
    branding: { ...(current?.branding ?? {}), splashColor: bp.theme.primary },
    navigation: {
      type: outPages.length === 1 ? "none" : bp.navigation,
      items: outPages.slice(0, bp.navigation === "drawer" ? 8 : 5).map((p) => ({ id: newId("nav"), label: p.title.slice(0, 30), icon: p.icon, pageId: p.id })),
    },
    homePageId: outPages[0]!.id,
    pages: outPages,
    ads: current?.ads ?? { enabled: false, imageUrl: "", linkUrl: "", label: "", position: "bottom" },
    integrations: current?.integrations ?? { push: { enabled: false } },
  };
  return sanitize(cfg);
}

/** Fix values the model may get slightly wrong (bad hex colors etc.) and validate. */
function sanitize(cfg: AppConfig): AppConfig {
  const okHex = (v: string, fb: string) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : fb);
  const t = cfg.theme;
  const dark = t.mode === "dark";
  cfg.theme = {
    ...t,
    primary: okHex(t.primary, "#6D28D9"),
    secondary: okHex(t.secondary, "#F59E0B"),
    background: okHex(t.background, dark ? "#0B0F19" : "#F8FAFC"),
    surface: okHex(t.surface, dark ? "#151B2B" : "#FFFFFF"),
    text: okHex(t.text, dark ? "#E2E8F0" : "#0F172A"),
  };
  cfg.branding.splashColor = okHex(cfg.branding.splashColor, cfg.theme.primary);
  const v = validateAppConfig(cfg);
  if (!v.ok) throw new ApiError(502, "La IA generó una configuración no válida. Inténtalo de nuevo.", v.errors);
  return v.config;
}

function configToBlueprintText(cfg: AppConfig): string {
  // Compact representation of the current app so the model can edit it.
  return JSON.stringify({
    appName: cfg.meta.name,
    description: cfg.meta.description,
    theme: cfg.theme,
    navigation: cfg.navigation.type,
    pages: cfg.pages.map((p) => ({ title: p.title, icon: p.icon, hideHeader: p.hideHeader, blocks: p.blocks.map((b) => ({ type: b.type, props: b.props })) })),
  });
}

function buildUserText(prompt: string, opts: { name?: string; current?: AppConfig }): string {
  return opts.current
    ? `Esta es mi app actual:\n${configToBlueprintText(opts.current)}\n\nAplica estos cambios y devuelve la app completa (conserva lo que no pida cambiar, incluidas las URLs de imágenes):\n${prompt}`
    : `Crea una app${opts.name ? ` llamada "${opts.name}"` : ""}:\n${prompt}`;
}

// ------------------------------------------------------------------ user's own AI account (BYOK)
/** Generates the app with the user's provider and key. Works for Claude, ChatGPT and Gemini. */
export async function generateWithUserKey(
  own: { provider: AiProvider; apiKey: string; model: string },
  prompt: string,
  opts: { name?: string; current?: AppConfig },
): Promise<{ config: AppConfig; summary: string }> {
  const system = `${SYSTEM}\n\nDevuelve SOLO un objeto JSON válido, sin texto antes ni después, que cumpla este JSON Schema:\n${BLUEPRINT_JSON_SCHEMA}`;
  const raw = await completeJson(own.provider, own.apiKey, own.model, system, buildUserText(prompt, opts));
  const parsed = BlueprintSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(502, "La IA no devolvió una estructura válida. Inténtalo de nuevo.");
  const bp = parsed.data;
  if (opts.name) bp.appName = opts.name;
  return { config: blueprintToConfig(bp, opts.current), summary: bp.summary };
}

// ------------------------------------------------------------------ Claude (platform key)
export async function generateWithClaude(prompt: string, opts: { name?: string; current?: AppConfig }): Promise<{ config: AppConfig; summary: string }> {
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const userText = buildUserText(prompt, opts);

  let response;
  try {
    response = await client.beta.messages.parse({
      model: env.aiModel(),
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(BlueprintSchema) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, "El asistente de IA está saturado. Inténtalo en un minuto.");
    if (e instanceof Anthropic.AuthenticationError) throw new ApiError(503, "La clave de la API de IA no es válida. Revisa ANTHROPIC_API_KEY.");
    if (e instanceof Anthropic.APIError) throw new ApiError(502, `Error del servicio de IA (${e.status ?? "red"})`);
    throw e;
  }
  if (response.stop_reason === "refusal") throw new ApiError(422, "La IA no puede crear esta app. Prueba a reformular la descripción.");
  if (response.stop_reason === "max_tokens") throw new ApiError(502, "La respuesta de la IA fue demasiado larga. Pide una app más sencilla.");
  const bp = response.parsed_output;
  if (!bp) throw new ApiError(502, "La IA no devolvió una estructura válida. Inténtalo de nuevo.");
  if (opts.name) bp.appName = opts.name;
  return { config: blueprintToConfig(bp, opts.current), summary: bp.summary };
}

// ------------------------------------------------------------------ rule-based fallback
const RULES: { re: RegExp; template: string }[] = [
  { re: /restaurante|bar\b|cafeter|comida|men[uú]|carta|pizzer/i, template: "restaurant" },
  { re: /radio|emisora|podcast/i, template: "radio" },
  { re: /noticia|peri[oó]dico|diario|blog|rss/i, template: "news" },
  { re: /m[uú]sica|cantante|banda|artista|canci/i, template: "music" },
  { re: /v[ií]deo|youtube|canal/i, template: "video" },
  { re: /tienda|productos|cat[aá]logo|venta|shop/i, template: "store" },
  { re: /academia|curso|escuela|colegio|clases|educa/i, template: "education" },
  { re: /comunidad|asociaci|club|grupo|iglesia|parroquia/i, template: "community" },
  { re: /web|p[aá]gina web|sitio/i, template: "web" },
  { re: /empresa|negocio|servicios|consultor|gimnasio|cl[ií]nica|peluquer/i, template: "business" },
];

const EXTRA: { re: RegExp; title: string; icon: string; block: string; props?: Record<string, unknown> }[] = [
  { re: /reserva|cita/i, title: "Reservas", icon: "calendar", block: "form", props: { title: "Reserva", submitLabel: "Reservar", fields: [{ label: "Nombre", kind: "text", required: true }, { label: "Teléfono", kind: "tel", required: true }, { label: "Fecha", kind: "date", required: true }] } },
  { re: /foto|galer[ií]a|im[aá]gen/i, title: "Fotos", icon: "images", block: "gallery", props: { images: [1, 2, 3, 4].map((i) => ({ src: `https://picsum.photos/seed/foto${i}/800/500`, caption: "" })) } },
  { re: /ubicaci[oó]n|mapa|d[oó]nde|direcci[oó]n/i, title: "Ubicación", icon: "map", block: "map" },
  { re: /contacto|tel[eé]fono|whatsapp|email/i, title: "Contacto", icon: "phone", block: "contact", props: { phone: "+34 600 000 000", email: "info@ejemplo.com" } },
  { re: /redes|instagram|facebook|tiktok/i, title: "Redes", icon: "share", block: "social" },
  { re: /formulario|inscrip|solicitud|presupuesto/i, title: "Formulario", icon: "form", block: "form" },
  { re: /buscador|buscar/i, title: "Buscar", icon: "search", block: "search" },
  { re: /usuarios|login|registro|socios|miembros/i, title: "Mi cuenta", icon: "user", block: "auth" },
];

const PALETTES: [RegExp, string, string][] = [
  [/verde|natural|eco|bosque/i, "#166534", "#CA8A04"],
  [/azul|mar|oc[eé]ano/i, "#0369A1", "#14B8A6"],
  [/rojo|pasi[oó]n/i, "#DC2626", "#111827"],
  [/rosa/i, "#DB2777", "#F59E0B"],
  [/negro|elegante|lujo/i, "#111827", "#D4AF37"],
  [/naranja/i, "#EA580C", "#0F766E"],
];

export function generateWithRules(prompt: string, opts: { name?: string }): { config: AppConfig; summary: string } {
  const tplId = RULES.find((r) => r.re.test(prompt))?.template ?? "blank";
  const cfg = structuredClone(TEMPLATE_MAP[tplId]!.config);
  const quoted = prompt.match(/["“«]([^"”»]{2,40})["”»]/)?.[1] ?? prompt.match(/(?:llamad[ao]|se llama|nombre)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ' ]{1,30})/)?.[1];
  cfg.meta.name = (opts.name || quoted || TEMPLATE_MAP[tplId]!.config.meta.name).trim().slice(0, 50);
  cfg.meta.description = prompt.slice(0, 500);

  const added: string[] = [];
  for (const e of EXTRA) {
    if (!e.re.test(prompt)) continue;
    if (cfg.pages.some((p) => p.blocks.some((b) => b.type === e.block))) continue;
    const id = newId("page");
    cfg.pages.push({ id, title: e.title, icon: e.icon, hideHeader: false, blocks: [{ id: newId("b"), type: e.block, props: { ...structuredClone(MODULE_MAP[e.block]!.defaultProps), ...(e.props ?? {}) } }] });
    added.push(e.title);
  }
  const pal = PALETTES.find(([re]) => re.test(prompt));
  if (pal) {
    cfg.theme.primary = pal[1];
    cfg.theme.secondary = pal[2];
    cfg.branding.splashColor = pal[1];
  }
  if (/oscur|dark|noche/i.test(prompt)) {
    Object.assign(cfg.theme, { mode: "dark", background: "#0B0F19", surface: "#151B2B", text: "#E2E8F0" });
  }
  if (cfg.pages.length > 1 && cfg.navigation.type === "none") cfg.navigation.type = "bottom";
  if (cfg.pages.length > 5) cfg.navigation.type = "drawer";
  cfg.navigation.items = cfg.pages.slice(0, cfg.navigation.type === "drawer" ? 8 : 5).map((p) => ({ id: newId("nav"), label: p.title.slice(0, 30), icon: p.icon, pageId: p.id }));

  const summary = `He partido de la plantilla «${TEMPLATE_MAP[tplId]!.name}»${added.length ? ` y he añadido: ${added.join(", ")}` : ""}.\nPáginas: ${cfg.pages.map((p) => p.title).join(", ")}.\n(Generador básico sin IA: conecta tu IA en Perfil → Inteligencia artificial para resultados personalizados.)`;
  return { config: sanitize(cfg), summary };
}
