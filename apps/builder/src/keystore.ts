import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { decrypt, encrypt, randomPassword } from "./crypto.js";
import { run } from "./gradle.js";
import { storage, storagePath } from "./storage.js";
import type { Log } from "./generate.js";

export const KEY_ALIAS = "forjapp";

/**
 * Every project gets its own upload key, generated on the first build and reused
 * forever: Android refuses updates signed with a different key.
 */
export async function ensureKeystore(db: PrismaClient, project: { id: string; name: string; keystoreKey: string | null; keystorePassword: string | null }, log: Log) {
  if (project.keystoreKey && project.keystorePassword) {
    return { storeFile: storagePath(project.keystoreKey), password: decrypt(project.keystorePassword), alias: KEY_ALIAS };
  }
  log("Generando clave de firma única para esta app (se reutilizará en futuras versiones)");
  const password = randomPassword();
  const tmp = await mkdtemp(join(tmpdir(), "fj-ks-"));
  const file = join(tmp, "release.jks");
  const cn = project.name.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/[,=+<>#;"\\]/g, " ").trim() || "Forjapp App";
  const res = await run(
    "keytool",
    ["-genkeypair", "-v", "-storetype", "PKCS12", "-keystore", file, "-alias", KEY_ALIAS, "-keyalg", "RSA", "-keysize", "4096", "-validity", "10000",
      "-storepass:env", "FJ_KS_PASS", "-keypass:env", "FJ_KS_PASS", "-dname", `CN=${cn}, O=Forjapp, C=ES`],
    // Password via env var so it never shows up in the process list.
    { cwd: tmp, onLine: () => {}, env: { FJ_KS_PASS: password } },
  );
  if (res.code !== 0) throw new Error("No se pudo generar el keystore (¿está instalado keytool/JDK?)");
  const key = `keystores/${project.id}.jks`;
  await storage.put(key, await readFile(file));
  await rm(tmp, { recursive: true, force: true });
  await db.project.update({ where: { id: project.id }, data: { keystoreKey: key, keystorePassword: encrypt(password) } });
  return { storeFile: storagePath(key), password, alias: KEY_ALIAS };
}
