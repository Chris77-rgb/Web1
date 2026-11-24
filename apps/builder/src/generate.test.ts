import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TEMPLATES } from "@forjapp/shared";

// Isolated work/storage dirs for the test run (must be set before importing config).
const tmp = await mkdtemp(join(tmpdir(), "fj-test-"));
process.env.BUILDER_WORK_DIR = join(tmp, "work");
process.env.STORAGE_DIR = join(tmp, "storage");
const { generateProject, toProperties, escapeAndroidString } = await import("./generate.js");

test("escapeAndroidString escapes quotes, apostrophes and leading @/?", () => {
  assert.equal(escapeAndroidString("Co's \"Bar\""), "Co\\'s \\\"Bar\\\"");
  assert.equal(escapeAndroidString("@home"), "\\@home");
});

test("toProperties escapes separators and unicode", () => {
  assert.equal(toProperties({ a: "x=y:z", b: "Ñ" }), "a=x\\=y\\:z\nb=\\u00d1\n");
});

test("generateProject writes a complete Gradle project", async () => {
  const config = structuredClone(TEMPLATES.find((t) => t.id === "radio")!.config);
  config.meta.name = "Radio <Test> & 'Co'";
  config.meta.packageName = "com.test.radio";
  const dir = await generateProject({ buildId: "t1", projectId: "p1", config, signing: null }, () => {});
  const manifest = await readFile(join(dir, "app/src/main/AndroidManifest.xml"), "utf8");
  assert.match(manifest, /android.permission.WAKE_LOCK/);
  assert.match(manifest, /android.permission.INTERNET/);
  assert.equal((manifest.match(/permission.INTERNET/g) ?? []).length, 1);
  const strings = await readFile(join(dir, "app/src/main/res/values/strings.xml"), "utf8");
  assert.match(strings, /Radio &lt;Test&gt; &amp; \\'Co\\'/);
  const props = await readFile(join(dir, "forjapp.properties"), "utf8");
  assert.match(props, /applicationId=com.test.radio/);
  const cfgJs = await readFile(join(dir, "app/src/main/assets/www/config.js"), "utf8");
  assert.ok(!cfgJs.includes("<Test>"), "config.js must escape < to avoid script injection");
  assert.ok(existsSync(join(dir, "app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png")));
  assert.ok(!existsSync(join(dir, "signing.properties")));
  await rm(tmp, { recursive: true, force: true });
});
