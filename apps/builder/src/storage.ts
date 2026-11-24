import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { cfg } from "./config.js";

export function storagePath(key: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new Error(`Clave de almacenamiento inválida: ${key}`);
  const full = resolve(cfg.storageDir, key);
  if (!full.startsWith(cfg.storageDir + sep)) throw new Error("Ruta fuera del almacenamiento");
  return full;
}

export const storage = {
  get: (key: string) => readFile(storagePath(key)),
  async put(key: string, data: Buffer) {
    const p = storagePath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
  },
  async putFile(key: string, src: string) {
    const p = storagePath(key);
    await mkdir(dirname(p), { recursive: true });
    await copyFile(src, p);
  },
};
