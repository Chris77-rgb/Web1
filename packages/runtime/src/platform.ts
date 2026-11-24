/**
 * Platform abstraction. In the generated Android app a native bridge
 * (`window.ForjappNative`, see android-template MainActivity.kt) is injected;
 * in the web preview we fall back to browser APIs and the platform proxy.
 */

interface NativeBridge {
  httpGet(url: string, callbackId: string): void;
  openExternal(url: string): void;
  enablePush(callbackId: string): void;
  platform(): string;
}

declare global {
  interface Window {
    ForjappNative?: NativeBridge;
    __forjappCallback?: (id: string, ok: boolean, body: string) => void;
    FORJAPP_ENV?: RuntimeEnv;
  }
}

export interface RuntimeEnv {
  /** Base URL of the Forjapp platform (forms, app users, RSS proxy). */
  apiBase: string;
  projectId: string;
  mode: "preview" | "app";
}

export function env(): RuntimeEnv {
  return window.FORJAPP_ENV ?? { apiBase: "", projectId: "", mode: "preview" };
}

const native = (): NativeBridge | undefined => window.ForjappNative;
export const isNative = () => !!native();

const pending = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>();
let seq = 0;
window.__forjappCallback = (id, ok, body) => {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  ok ? p.resolve(body) : p.reject(new Error(body || "Error de red"));
};

function nativeCall(fn: (id: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = `cb${++seq}`;
    pending.set(id, { resolve, reject });
    fn(id);
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error("Tiempo de espera agotado"));
    }, 20000);
  });
}

/** Fetch text from any URL, bypassing CORS (native bridge or platform proxy). */
export async function fetchText(url: string): Promise<string> {
  const n = native();
  if (n) return nativeCall((id) => n.httpGet(url, id));
  const { apiBase } = env();
  const res = await fetch(`${apiBase}/api/v1/proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function openExternal(url: string): void {
  const safe = safeUrl(url, ["http:", "https:", "tel:", "mailto:", "geo:", "whatsapp:"]);
  if (!safe) return;
  const n = native();
  if (n) n.openExternal(safe);
  else window.open(safe, "_blank", "noopener");
}

export async function enablePush(): Promise<string> {
  const n = native();
  if (!n) throw new Error("Las notificaciones push solo funcionan en la app instalada.");
  return nativeCall((id) => n.enablePush(id));
}

/** Returns the URL if its protocol is allowed, otherwise "". Prevents javascript: injection. */
export function safeUrl(url: unknown, protocols = ["http:", "https:"]): string {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const u = new URL(url.trim(), location.href);
    if (u.protocol === "data:" && protocols.includes("data:") && /^data:image\//.test(url)) return u.href;
    return protocols.includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

/** Resolve images: absolute URLs as-is, platform-relative paths against apiBase. */
export function assetUrl(src: unknown): string {
  if (typeof src !== "string" || !src) return "";
  if (src.startsWith("/")) return `${env().apiBase}${src}`;
  if (src.startsWith("assets/")) return src; // bundled inside the APK
  return safeUrl(src, ["http:", "https:", "data:"]);
}

// ---- storage (sandboxed preview iframes may block localStorage) ----
const mem = new Map<string, string>();
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return mem.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      mem.set(key, value);
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      mem.delete(key);
    }
  },
};
