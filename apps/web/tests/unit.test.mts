/** Unit tests for server libraries. Run with: npm test -w @forjapp/web */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAppConfig } from "@forjapp/shared";
import { isPrivateIp } from "../src/lib/safe-fetch.ts";
import { generateWithRules } from "../src/lib/ai.ts";
import { registerSchema } from "../src/lib/validators.ts";
import { sniffMime } from "../src/lib/storage.ts";

test("SSRF guard blocks private and loopback addresses", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.20.3.4", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700::1111"]) assert.ok(!isPrivateIp(ip), ip);
});

test("rule-based AI builds a valid restaurant app with requested modules", () => {
  const { config } = generateWithRules('App para mi restaurante "La Tasca" con reservas, fotos, mapa y contacto en tonos verdes', {});
  assert.ok(validateAppConfig(config).ok);
  assert.equal(config.meta.name, "La Tasca");
  assert.equal(config.theme.primary, "#166534");
  const types = config.pages.flatMap((p) => p.blocks.map((b) => b.type));
  for (const t of ["form", "gallery", "map", "contact"]) assert.ok(types.includes(t), t);
});

test("password policy", () => {
  assert.ok(!registerSchema.safeParse({ name: "Ana", email: "a@b.co", password: "short1" }).success);
  assert.ok(!registerSchema.safeParse({ name: "Ana", email: "a@b.co", password: "onlyletters" }).success);
  assert.ok(registerSchema.safeParse({ name: "Ana", email: "A@B.co", password: "letters123" }).success);
});

test("upload sniffing rejects disguised files", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert.equal(sniffMime(png, "image/jpeg"), "image/png");
  assert.equal(sniffMime(Buffer.from("<svg onload=alert(1)>"), "image/svg+xml"), null);
  assert.equal(sniffMime(Buffer.from("not json"), "application/json"), null);
});

test("AI blueprint schema converts to a JSON schema for structured outputs", async () => {
  const mod = await import("../src/lib/ai.ts");
  assert.ok(typeof mod.generateWithClaude === "function");
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
  const z = await import("zod/v4");
  const fmt = betaZodOutputFormat(z.object({ a: z.enum(["x", "y"]), b: z.array(z.object({ k: z.string() })) }));
  assert.equal(fmt.type, "json_schema");
});

test("extractJson tolerates code fences and surrounding text from any provider", async () => {
  const { extractJson } = await import("../src/lib/ai-providers.ts");
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Aquí tienes: {"a":{"b":[1,2]}} gracias'), { a: { b: [1, 2] } });
  assert.throws(() => extractJson("sin json"));
});
