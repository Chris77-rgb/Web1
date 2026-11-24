/**
 * File storage abstraction. The local driver writes under STORAGE_DIR, which is
 * a volume shared with the builder service. Swap in an S3 driver by
 * implementing the same interface.
 */
import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { env } from "./env";

export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  stream(key: string): Promise<{ stream: ReadableStream; size: number }>;
  remove(key: string): Promise<void>;
}

function safePath(key: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new Error("Clave de almacenamiento inválida");
  const root = resolve(env.storageDir);
  const full = resolve(root, key);
  if (!full.startsWith(root + sep)) throw new Error("Ruta fuera del almacenamiento");
  return full;
}

export const storage: Storage = {
  async put(key, data) {
    const p = safePath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
  },
  get: (key) => readFile(safePath(key)),
  async stream(key) {
    const p = safePath(key);
    const s = await stat(p);
    return { stream: Readable.toWeb(createReadStream(p)) as ReadableStream, size: s.size };
  },
  remove: (key) => rm(safePath(key), { force: true }),
};

export const ALLOWED_UPLOADS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/json": "json",
};

/** Validate file signature, not just the declared MIME type. */
export function sniffMime(buf: Buffer, declared: string): string | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 6).toString() === "GIF89a" || buf.subarray(0, 6).toString() === "GIF87a") return "image/gif";
  if (declared === "application/json") {
    try {
      JSON.parse(buf.toString("utf8"));
      return "application/json";
    } catch {
      return null;
    }
  }
  // SVG is intentionally not accepted from users (script injection risk).
  return null;
}
