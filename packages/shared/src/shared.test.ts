import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, validateAppConfig, computePermissions, packageNameSchema, suggestPackageName } from "./index";

test("all templates are valid app configs", () => {
  for (const t of TEMPLATES) {
    const r = validateAppConfig(t.config);
    assert.ok(r.ok, `${t.id}: ${!r.ok ? r.errors.join(", ") : ""}`);
  }
});

test("package name validation", () => {
  assert.ok(packageNameSchema.safeParse("com.example.app").success);
  assert.ok(!packageNameSchema.safeParse("com.class.app").success);
  assert.ok(!packageNameSchema.safeParse("app").success);
  assert.ok(!packageNameSchema.safeParse("Com.Example").success);
  assert.equal(suggestPackageName("Mi Restaurante Ñandú"), "com.forjapp.mirestaurantenandu");
});

test("permissions derived from modules", () => {
  const radio = TEMPLATES.find((t) => t.id === "radio")!.config;
  const perms = computePermissions(radio);
  assert.ok(perms.includes("INTERNET"));
  assert.ok(perms.includes("WAKE_LOCK"));
});

test("cross-reference validation catches missing home page", () => {
  const cfg = structuredClone(TEMPLATES[0]!.config);
  cfg.homePageId = "nope";
  const r = validateAppConfig(cfg);
  assert.ok(!r.ok);
});
