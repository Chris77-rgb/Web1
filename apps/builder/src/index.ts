/** Entry point of the builder service: `npm run start -w @forjapp/builder` */
import { existsSync } from "node:fs";
import { cfg } from "./config.js";
import { claimNext, db, processBuild, reapStale } from "./worker.js";

let running = 0;
let stopping = false;

function preflight() {
  const problems: string[] = [];
  if (!existsSync(cfg.androidHome)) problems.push(`ANDROID_HOME no existe: ${cfg.androidHome}`);
  if (!existsSync(cfg.runtimeJs)) problems.push(`Runtime no compilado: ${cfg.runtimeJs} (npm run build:runtime)`);
  if (cfg.encryptionKey.length < 32) problems.push("ENCRYPTION_KEY no configurada (mín. 32 caracteres)");
  if (problems.length) {
    console.error(`El builder no puede arrancar:\n - ${problems.join("\n - ")}`);
    process.exit(1);
  }
}

async function tick() {
  while (!stopping && running < cfg.concurrency) {
    const build = await claimNext();
    if (!build) break;
    running++;
    processBuild(build)
      .catch((e) => console.error("build crashed", e))
      .finally(() => { running--; void tick(); });
  }
}

async function main() {
  preflight();
  console.log(`Forjapp builder ${cfg.workerId} · concurrencia ${cfg.concurrency} · storage ${cfg.storageDir}`);
  const reaped = await reapStale();
  if (reaped) console.log(`${reaped} compilaciones huérfanas marcadas como fallidas`);
  setInterval(() => void tick().catch((e) => console.error("poll error", e)), cfg.pollMs);
  setInterval(() => void reapStale().catch(() => {}), 60_000);
  await tick();
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    stopping = true;
    console.log(`Recibido ${sig}, esperando a ${running} compilaciones…`);
    const wait = setInterval(async () => {
      if (running === 0) {
        clearInterval(wait);
        await db.$disconnect();
        process.exit(0);
      }
    }, 500);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
