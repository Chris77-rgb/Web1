/**
 * API integration tests against a running server (default http://localhost:3000).
 * Skipped automatically when no server is reachable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const up = await fetch(`${BASE}/login`).then((r) => r.ok).catch(() => false);
const email = `test-${Date.now()}@example.com`;
let cookie = "";

async function call(path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  if (set?.startsWith("fj_session=")) cookie = set.split(";")[0]!;
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, any> };
}

test("auth, projects, ownership and limits", { skip: !up && "server not running" }, async () => {
  assert.equal((await call("/api/v1/projects")).status, 401);
  assert.equal((await call("/api/v1/auth/register", { body: { name: "Test", email, password: "weak" } })).status, 400);
  assert.equal((await call("/api/v1/auth/register", { body: { name: "Test", email, password: "Secreta123" } })).status, 201);
  assert.equal((await call("/api/v1/auth/register", { body: { name: "Test", email, password: "Secreta123" } })).status, 409);

  const created = await call("/api/v1/projects", { body: { name: "Prueba", templateId: "news" } });
  assert.equal(created.status, 201);
  const p = created.json.project;

  // Invalid config is rejected with details
  const bad = await call(`/api/v1/projects/${p.id}`, { method: "PATCH", body: { config: { ...p.config, homePageId: "nope" }, revision: p.revision } });
  assert.equal(bad.status, 422);
  // Stale revision → conflict
  const ok1 = await call(`/api/v1/projects/${p.id}`, { method: "PATCH", body: { config: p.config, revision: p.revision } });
  assert.equal(ok1.status, 200);
  assert.equal((await call(`/api/v1/projects/${p.id}`, { method: "PATCH", body: { config: p.config, revision: p.revision } })).status, 409);

  // Unverified users cannot build; free plan cannot build AAB
  assert.equal((await call(`/api/v1/projects/${p.id}/builds`, { body: { type: "APK" } })).status, 403);

  // Free plan: 2 projects max
  assert.equal((await call("/api/v1/projects", { body: { name: "Segunda" } })).status, 201);
  assert.equal((await call("/api/v1/projects", { body: { name: "Tercera" } })).status, 402);

  // Another user cannot read this project
  const mine = cookie;
  cookie = "";
  await call("/api/v1/auth/register", { body: { name: "Otro", email: `o-${email}`, password: "Secreta123" } });
  assert.equal((await call(`/api/v1/projects/${p.id}`)).status, 404);
  assert.equal((await call("/api/v1/admin/settings", { method: "PUT", body: {} })).status, 403);
  cookie = mine;

  // Public form endpoint (used by generated apps) with CORS
  const res = await fetch(`${BASE}/api/public/apps/${p.id}/forms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockId: "b1", data: { Nombre: "Ana" } }) });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");

  // SSRF: proxy refuses internal addresses
  assert.equal((await fetch(`${BASE}/api/v1/proxy?url=${encodeURIComponent("http://127.0.0.1:5432/")}`)).status, 502);

  assert.equal((await call(`/api/v1/projects/${p.id}`, { method: "DELETE" })).status, 200);
});
