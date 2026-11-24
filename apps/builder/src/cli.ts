/** Process a single queued build and exit (useful for debugging): npm run build-once -w @forjapp/builder */
import { claimNext, db, processBuild } from "./worker.js";

const build = await claimNext();
if (!build) console.log("No hay compilaciones en cola");
else {
  await processBuild(build);
  const done = await db.build.findUniqueOrThrow({ where: { id: build.id }, select: { status: true, error: true, artifactKey: true } });
  console.log(done);
}
await db.$disconnect();
