/**
 * AppConfig: the single source of truth describing a user's mobile app.
 *
 * It is stored as JSON in `Project.config`, edited by the visual editor,
 * rendered by @forjapp/runtime (both in the live preview and inside the
 * generated Android app) and read by the builder to produce APK/AAB files.
 *
 * Any change here must stay backwards compatible or bump `schemaVersion`
 * and add a migration in `migrate.ts`.
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Color hexadecimal inválido (#RRGGBB)");

/** Android applicationId rules: >= 2 segments, each starting with a letter. */
export const packageNameSchema = z
  .string()
  .min(3)
  .max(150)
  .regex(
    /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
    "Identificador de paquete inválido (ej: com.miempresa.miapp)",
  )
  .refine(
    (v) => !v.split(".").some((seg) => JAVA_RESERVED.has(seg)),
    "El identificador contiene una palabra reservada de Java",
  );

const JAVA_RESERVED = new Set(
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null".split(
    " ",
  ),
);

export const FONTS = ["Inter", "Roboto", "Poppins", "Merriweather", "Montserrat", "Lora", "Nunito", "Playfair Display"] as const;

export const ANDROID_PERMISSIONS = [
  "INTERNET",
  "ACCESS_NETWORK_STATE",
  "POST_NOTIFICATIONS",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "CAMERA",
  "READ_MEDIA_IMAGES",
  "FOREGROUND_SERVICE",
  "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "WAKE_LOCK",
  "VIBRATE",
] as const;
export type AndroidPermission = (typeof ANDROID_PERMISSIONS)[number];

export const blockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(40),
  props: z.record(z.unknown()).default({}),
});
export type Block = z.infer<typeof blockSchema>;

export const pageSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(60),
  icon: z.string().max(40).default("file"),
  /** Hide the top bar on this page (useful for splash-like home screens). */
  hideHeader: z.boolean().default(false),
  blocks: z.array(blockSchema).max(100).default([]),
});
export type Page = z.infer<typeof pageSchema>;

export const navItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(30),
  icon: z.string().max(40).default("circle"),
  pageId: z.string().min(1).max(64),
});
export type NavItem = z.infer<typeof navItemSchema>;

export const appConfigSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  meta: z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(500).default(""),
    packageName: packageNameSchema,
    versionCode: z.number().int().min(1).max(2_100_000_000).default(1),
    versionName: z.string().regex(/^\d+(\.\d+){0,3}$/, "Versión inválida (ej: 1.0.0)").default("1.0.0"),
    orientation: z.enum(["portrait", "landscape", "auto"]).default("portrait"),
    /** Extra permissions requested manually by the user. Module permissions are added automatically. */
    permissions: z.array(z.enum(ANDROID_PERMISSIONS)).default([]),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]).default("light"),
    primary: hexColor.default("#6D28D9"),
    secondary: hexColor.default("#F59E0B"),
    background: hexColor.default("#F8FAFC"),
    surface: hexColor.default("#FFFFFF"),
    text: hexColor.default("#0F172A"),
    font: z.enum(FONTS).default("Inter"),
    radius: z.number().int().min(0).max(32).default(14),
  }),
  branding: z.object({
    logoUrl: z.string().max(500).optional(),
    iconUrl: z.string().max(500).optional(),
    splashColor: hexColor.default("#6D28D9"),
  }),
  navigation: z.object({
    type: z.enum(["bottom", "drawer", "none"]).default("bottom"),
    items: z.array(navItemSchema).max(8).default([]),
  }),
  homePageId: z.string().min(1).max(64),
  pages: z.array(pageSchema).min(1).max(50),
  integrations: z
    .object({
      push: z
        .object({
          enabled: z.boolean().default(false),
          /** Storage key of the uploaded google-services.json */
          googleServicesKey: z.string().max(300).optional(),
        })
        .default({}),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;

/** Validates structure + cross references (home page, nav targets, unique ids). */
export function validateAppConfig(input: unknown):
  | { ok: true; config: AppConfig }
  | { ok: false; errors: string[] } {
  const parsed = appConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const cfg = parsed.data;
  const errors: string[] = [];
  const pageIds = new Set<string>();
  for (const p of cfg.pages) {
    if (pageIds.has(p.id)) errors.push(`pages: id duplicado "${p.id}"`);
    pageIds.add(p.id);
    const blockIds = new Set<string>();
    for (const b of p.blocks) {
      if (blockIds.has(b.id)) errors.push(`pages.${p.id}: bloque duplicado "${b.id}"`);
      blockIds.add(b.id);
    }
  }
  if (!pageIds.has(cfg.homePageId)) errors.push("homePageId: la página de inicio no existe");
  for (const item of cfg.navigation.items) {
    if (!pageIds.has(item.pageId)) errors.push(`navigation: "${item.label}" apunta a una página inexistente`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, config: cfg };
}

export function newId(prefix = "id"): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}_${ts}${rnd}`;
}

/** Turn a free app name into a valid package segment. */
export function slugifySegment(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
  const seg = /^[a-z]/.test(s) ? s : `app${s}`;
  return JAVA_RESERVED.has(seg) ? `${seg}app` : seg || "app";
}

export function suggestPackageName(appName: string, owner = "forjapp"): string {
  return `com.${slugifySegment(owner)}.${slugifySegment(appName)}`;
}
