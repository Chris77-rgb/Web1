// Must stay byte-compatible with apps/web/src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { cfg } from "./config.js";

function key(): Buffer {
  if (cfg.encryptionKey.length < 32) throw new Error("ENCRYPTION_KEY debe tener al menos 32 caracteres");
  return scryptSync(cfg.encryptionKey, "forjapp-v1", 32);
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export const randomPassword = () => randomBytes(24).toString("base64url");
