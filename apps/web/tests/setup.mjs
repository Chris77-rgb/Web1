// Test preload: `server-only` throws outside Next's server bundle, so stub it.
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return next(spec, ctx);
}`));

// Same for CommonJS requires (tsx compiles the app's .ts files as CJS).
import Module from "node:module";
import { fileURLToPath } from "node:url";
const stub = fileURLToPath(new URL("./server-only-stub.cjs", import.meta.url));
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === "server-only" ? stub : orig.call(this, request, ...rest);
};
