import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));

export const cfg = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  storageDir: resolve(process.env.STORAGE_DIR ?? resolve(here, "../../../storage")),
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  androidHome: process.env.ANDROID_HOME ?? "/opt/android-sdk",
  gradleBin: process.env.GRADLE_BIN ?? "gradle",
  gradleDaemon: process.env.GRADLE_DAEMON !== "false",
  concurrency: Math.max(1, Number(process.env.BUILDER_CONCURRENCY ?? 1)),
  timeoutMs: Math.max(1, Number(process.env.BUILD_TIMEOUT_MINUTES ?? 20)) * 60_000,
  pollMs: Number(process.env.BUILDER_POLL_MS ?? 3000),
  templateDir: resolve(here, "../android-template"),
  workDir: resolve(process.env.BUILDER_WORK_DIR ?? resolve(here, "../work")),
  runtimeJs: resolve(process.env.RUNTIME_JS ?? resolve(here, "../../../packages/runtime/dist/runtime.js")),
  workerId: `${hostname()}-${process.pid}`,
  keepWorkDir: process.env.BUILDER_KEEP_WORKDIR === "true",
};
