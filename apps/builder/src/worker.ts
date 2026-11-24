/**
 * Build worker. Jobs live in the `Build` table; workers claim them atomically with
 * `FOR UPDATE SKIP LOCKED`, so any number of builder containers can run in parallel.
 */
import { stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient, type Build } from "@prisma/client";
import { cfg } from "./config.js";
import { generateProject } from "./generate.js";
import { ensureKeystore } from "./keystore.js";
import { gradleArgs, run } from "./gradle.js";
import { storage } from "./storage.js";

export const db = new PrismaClient();
const MAX_LOG = 200_000;

export async function claimNext(): Promise<Build | null> {
  const rows = await db.$queryRaw<Build[]>`
    UPDATE "Build" SET status = 'RUNNING', "startedAt" = now(), "workerId" = ${cfg.workerId}, attempts = attempts + 1
    WHERE id = (
      SELECT id FROM "Build" WHERE status = 'QUEUED'
      ORDER BY priority DESC, "queuedAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING *`;
  return rows[0] ?? null;
}

/** Fails builds whose worker died (no progress for longer than the timeout). */
export async function reapStale(): Promise<number> {
  const limit = new Date(Date.now() - cfg.timeoutMs - 5 * 60_000);
  const res = await db.build.updateMany({
    where: { status: "RUNNING", startedAt: { lt: limit } },
    data: { status: "FAILED", finishedAt: new Date(), error: "El servicio de compilación dejó de responder. Vuelve a intentarlo." },
  });
  return res.count;
}

class BuildLogger {
  private lines: string[] = [];
  private flushing: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval>;
  canceled = false;

  constructor(private id: string) {
    this.timer = setInterval(() => void this.flush(), 2000);
  }

  log = (line: string) => {
    const clean = line.replace(/\x1b\[[0-9;]*m/g, "");
    this.lines.push(`[${new Date().toISOString().slice(11, 19)}] ${clean}`);
    if (!/^\s*>?\s*Task|^\s*$/.test(clean)) console.log(`[build ${this.id.slice(-6)}] ${clean}`);
  };

  flush(): Promise<void> {
    this.flushing = this.flushing.then(async () => {
      const batch = this.lines.splice(0);
      const text = batch.length ? `${batch.join("\n")}\n` : "";
      // Append + truncate in SQL; also tells us if the user canceled.
      const rows = await db.$queryRaw<{ status: string }[]>`
        UPDATE "Build" SET log = right(log || ${text}, ${MAX_LOG}::int) WHERE id = ${this.id} RETURNING status`;
      if (rows[0]?.status === "CANCELED") this.canceled = true;
    }).catch((e) => console.error("log flush failed", e));
    return this.flushing;
  }

  async close() {
    clearInterval(this.timer);
    await this.flush();
  }
}

export async function processBuild(build: Build): Promise<void> {
  const logger = new BuildLogger(build.id);
  const { log } = logger;
  let dir: string | null = null;
  const started = Date.now();
  try {
    log(`Compilación ${build.type} iniciada en ${cfg.workerId}`);
    const project = await db.project.findUniqueOrThrow({ where: { id: build.projectId } });
    const signing = await ensureKeystore(db, project, log);
    dir = await generateProject({ buildId: build.id, projectId: build.projectId, config: build.configSnapshot, signing }, log);

    const task = build.type === "AAB" ? "bundleRelease" : "assembleRelease";
    log(`Ejecutando Gradle: ${task}`);
    const res = await run(cfg.gradleBin, gradleArgs(task), {
      cwd: dir,
      onLine: log,
      timeoutMs: cfg.timeoutMs,
      shouldAbort: () => logger.canceled,
      env: { ANDROID_HOME: cfg.androidHome, ANDROID_SDK_ROOT: cfg.androidHome },
    });
    if (logger.canceled) {
      log("Compilación cancelada");
      return;
    }
    if (res.code !== 0) throw new Error(`Gradle terminó con error (código ${res.code ?? res.signal})`);

    const out = build.type === "AAB" ? join(dir, "app/build/outputs/bundle/release/app-release.aab") : join(dir, "app/build/outputs/apk/release/app-release.apk");
    const size = (await stat(out)).size;
    const key = `builds/${build.projectId}/${build.id}.${build.type === "AAB" ? "aab" : "apk"}`;
    await storage.putFile(key, out);
    log(`✅ ${build.type} firmado generado (${(size / 1024 / 1024).toFixed(2)} MB) en ${Math.round((Date.now() - started) / 1000)} s`);
    await logger.close();
    await db.build.updateMany({ where: { id: build.id, status: "RUNNING" }, data: { status: "SUCCESS", artifactKey: key, artifactSize: size, finishedAt: new Date() } });
  } catch (e) {
    const msg = (e as Error).message;
    log(`❌ ${msg}`);
    await logger.close();
    await db.build.updateMany({ where: { id: build.id, status: "RUNNING" }, data: { status: "FAILED", error: msg.slice(0, 1000), finishedAt: new Date() } });
  } finally {
    await logger.close();
    if (dir && !cfg.keepWorkDir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
