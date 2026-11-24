// Bundles the runtime into a single IIFE file and copies it where consumers expect it.
import { build } from "esbuild";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "dist/runtime.js");

await build({
  entryPoints: [resolve(here, "src/index.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["chrome80", "safari14"],
  outfile: out,
  legalComments: "none",
});

const webPublic = resolve(here, "../../apps/web/public/runtime");
mkdirSync(webPublic, { recursive: true });
copyFileSync(out, resolve(webPublic, "runtime.js"));
console.log("runtime built →", out);
