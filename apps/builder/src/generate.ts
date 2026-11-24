/**
 * Turns an AppConfig into a ready-to-compile Android Gradle project:
 *   template copy → forjapp.properties → manifest (permissions, orientation, services)
 *   → launcher icons → web assets (runtime + config + bundled images) → Firebase config.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";
import { computePermissions, validateAppConfig, type AppConfig } from "@forjapp/shared";
import { cfg } from "./config.js";
import { storage } from "./storage.js";

export type Log = (line: string) => void;

const ICON_SIZES: Record<string, number> = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FILES_PREFIX = "/api/v1/files/";
const MAX_REMOTE_IMAGE = 8 * 1024 * 1024;

export interface GenerateInput {
  buildId: string;
  projectId: string;
  config: unknown;
  /** Absolute path of the signing keystore + credentials, or null for unsigned debug-style builds. */
  signing: { storeFile: string; password: string; alias: string } | null;
}

export async function generateProject(input: GenerateInput, log: Log): Promise<string> {
  const v = validateAppConfig(input.config);
  if (!v.ok) throw new Error(`Configuración inválida: ${v.errors.join("; ")}`);
  const config = structuredClone(v.config);

  const dir = join(cfg.workDir, input.buildId);
  await rm(dir, { recursive: true, force: true });
  await mkdir(cfg.workDir, { recursive: true });
  await cp(cfg.templateDir, dir, {
    recursive: true,
    filter: (src) => !/[/\\](build|\.gradle|local\.properties)([/\\]|$)/.test(src.slice(cfg.templateDir.length)),
  });
  log(`Proyecto Android creado a partir de la plantilla`);

  // 1. Gradle properties (identity, version)
  const props = {
    applicationId: config.meta.packageName,
    versionCode: String(config.meta.versionCode),
    versionName: config.meta.versionName,
    pushEnabled: String(config.integrations.push.enabled && !!config.integrations.push.googleServicesKey),
  };
  await writeFile(join(dir, "forjapp.properties"), toProperties(props));
  await writeFile(join(dir, "local.properties"), toProperties({ "sdk.dir": cfg.androidHome }));
  const values = join(dir, "app/src/main/res/values");
  await writeFile(join(values, "strings.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${escapeXml(escapeAndroidString(config.meta.name))}</string>\n</resources>\n`);
  await writeFile(join(values, "colors.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_color">${config.branding.splashColor}</color>\n</resources>\n`);
  log(`Paquete ${props.applicationId} · versión ${props.versionName} (${props.versionCode})`);

  if (input.signing) {
    await writeFile(
      join(dir, "signing.properties"),
      toProperties({ storeFile: input.signing.storeFile, storePassword: input.signing.password, keyAlias: input.signing.alias, keyPassword: input.signing.password }),
    );
  }

  // 2. Manifest
  const permissions = computePermissions(config);
  const manifestPath = join(dir, "app/src/main/AndroidManifest.xml");
  let manifest = await readFile(manifestPath, "utf8");
  manifest = manifest
    .replace(/\s*<uses-permission android:name="android.permission.INTERNET" \/>/, "")
    .replace("<!-- FORJAPP_PERMISSIONS -->", permissions.map((p) => `<uses-permission android:name="android.permission.${p}" />`).join("\n    "))
    .replace(/android:screenOrientation="[^"]*"/, `android:screenOrientation="${{ portrait: "portrait", landscape: "landscape", auto: "unspecified" }[config.meta.orientation]}"`);
  if (props.pushEnabled === "true") {
    manifest = manifest.replace(
      "<!-- FORJAPP_SERVICES -->",
      `<service android:name=".PushService" android:exported="false">\n            <intent-filter><action android:name="com.google.firebase.MESSAGING_EVENT" /></intent-filter>\n        </service>`,
    );
  }
  await writeFile(manifestPath, manifest);
  log(`Permisos: ${permissions.join(", ")}`);

  // 3. Launcher icons
  await generateIcons(config, join(dir, "app/src/main/res"), log);

  // 4. Web assets: bundle uploaded images so the app works offline
  const www = join(dir, "app/src/main/assets/www");
  await rm(www, { recursive: true, force: true });
  await mkdir(join(www, "assets/img"), { recursive: true });
  const bundled = await bundleImages(config, join(www, "assets/img"), log);
  const runtime = await readFile(cfg.runtimeJs, "utf8").catch(() => {
    throw new Error(`No se encuentra el runtime (${cfg.runtimeJs}). Ejecuta "npm run build:runtime".`);
  });
  await writeFile(join(www, "runtime.js"), runtime);
  const env = { apiBase: cfg.appUrl, projectId: input.projectId, mode: "app" };
  // JSON.stringify + escaping "<" prevents breaking out of the <script> context.
  const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  await writeFile(join(www, "config.js"), `window.FORJAPP_ENV=${safeJson(env)};\nwindow.FORJAPP_CONFIG=${safeJson(config)};\n`);
  await writeFile(
    join(www, "index.html"),
    `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data: blob:; media-src * blob:; frame-src https:; connect-src https: ${cfg.appUrl.startsWith("http://") ? cfg.appUrl : ""}">
<title>${escapeHtml(config.meta.name)}</title>
<style>html,body{margin:0;background:${config.theme.background}}</style>
<script src="config.js"></script>
<script src="runtime.js" defer></script>
</head><body></body></html>
`,
  );
  log(`Recursos web empaquetados (${bundled} imágenes incluidas)`);

  // 5. Firebase
  if (props.pushEnabled === "true") {
    const gs = await storage.get(config.integrations.push.googleServicesKey!);
    const parsed = JSON.parse(gs.toString("utf8")) as { client?: { client_info?: { android_client_info?: { package_name?: string } } }[] };
    const pkgs = (parsed.client ?? []).map((c) => c.client_info?.android_client_info?.package_name);
    if (!pkgs.includes(config.meta.packageName)) throw new Error(`google-services.json no contiene el paquete ${config.meta.packageName}`);
    await writeFile(join(dir, "app/google-services.json"), gs);
    log("Notificaciones push configuradas (Firebase)");
  }
  return dir;
}

async function generateIcons(config: AppConfig, resDir: string, log: Log) {
  let source: Buffer | null = null;
  const src = config.branding.iconUrl || config.branding.logoUrl;
  if (src) {
    try {
      source = await loadImage(src);
    } catch (e) {
      log(`⚠ No se pudo cargar el icono (${(e as Error).message}); se usará un icono generado`);
    }
  }
  if (!source) source = await letterIcon(config.meta.name, config.theme.primary);
  // Normalise once: square, opaque background so transparent logos look good on any launcher.
  const base = await sharp(source).resize(512, 512, { fit: "contain", background: config.theme.surface }).flatten({ background: config.theme.surface }).png().toBuffer();
  for (const [density, size] of Object.entries(ICON_SIZES)) {
    const d = join(resDir, `mipmap-${density}`);
    await mkdir(d, { recursive: true });
    await sharp(base).resize(size, size).png().toFile(join(d, "ic_launcher.png"));
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
    await sharp(base).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).png().toFile(join(d, "ic_launcher_round.png"));
  }
  log("Iconos de la app generados (mdpi → xxxhdpi, normal y redondo)");
}

function letterIcon(name: string, color: string): Promise<Buffer> {
  const letter = escapeHtml((name.trim()[0] ?? "A").toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${color}"/><text x="50%" y="54%" font-family="DejaVu Sans, Arial, sans-serif" font-size="280" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${letter}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Loads an image from platform storage (uploads) or a public https URL. */
async function loadImage(url: string): Promise<Buffer> {
  if (url.startsWith(FILES_PREFIX)) return storage.get(url.slice(FILES_PREFIX.length));
  if (!/^https:\/\//.test(url)) throw new Error("URL no soportada");
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_REMOTE_IMAGE) throw new Error("Imagen demasiado grande");
  return buf;
}

/** Copies every platform-hosted image referenced in the config into the APK and rewrites the URLs. */
async function bundleImages(config: AppConfig, outDir: string, log: Log): Promise<number> {
  const map = new Map<string, string>();
  const visit = async (v: unknown): Promise<unknown> => {
    if (typeof v === "string" && v.startsWith(`${FILES_PREFIX}uploads/`)) {
      if (!map.has(v)) {
        try {
          const name = basename(v);
          await writeFile(join(outDir, name), await storage.get(v.slice(FILES_PREFIX.length)));
          map.set(v, `assets/img/${name}`);
        } catch {
          log(`⚠ Imagen no encontrada: ${v}`);
          map.set(v, `${cfg.appUrl}${v}`);
        }
      }
      return map.get(v);
    }
    if (Array.isArray(v)) return Promise.all(v.map(visit));
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) o[k] = await visit(o[k]);
    }
    return v;
  };
  await visit(config);
  return map.size;
}

export function toProperties(o: Record<string, string>): string {
  // java.util.Properties escaping (keys are simple identifiers here).
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[=:#!]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return Object.entries(o).map(([k, v]) => `${k}=${esc(v)}`).join("\n") + "\n";
}

/** Android resource strings: escape quotes, apostrophes, @ and ? at start, and backslashes. */
export function escapeAndroidString(s: string): string {
  let out = s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  if (/^[@?]/.test(out)) out = `\\${out}`;
  return out;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
