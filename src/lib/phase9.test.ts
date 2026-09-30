import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { canRetryRequest, isCacheablePwaPath, isSensitivePwaPath } from "./pwa-policy.ts";
import { phase9Messages } from "./phase9-messages.ts";

test("PWA cache policy never caches verification or server operations", () => {
  for (const path of ["/api/verification/public/abc", "/api/project-documents", "/verify/public-token"]) {
    assert.equal(isSensitivePwaPath(path), true);
    assert.equal(isCacheablePwaPath(path), false);
  }
  assert.equal(isCacheablePwaPath("/_next/static/chunks/app.js"), true);
  assert.equal(isCacheablePwaPath("/icons/icon-512.svg"), true);
  assert.equal(canRetryRequest("GET"), true);
  assert.equal(canRetryRequest("POST"), false);
});

test("service worker keeps verification and API responses outside every cache", async () => {
  const source = await readFile(new URL("../../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /path\.startsWith\("\/api\/"\).*path\.startsWith\("\/verify\/"\)/);
  assert.match(source, /if \(url\.origin !== self\.location\.origin \|\| sensitive\(url\.pathname\)\) return/);
  assert.doesNotMatch(source, /cache\.addAll\([^)]*verify/);
  assert.match(source, /blocksystem-shell-v1\.0\.0/);
});

test("manifest, production-only registration, and 3D lazy boundary are present", async () => {
  const [manifest, pwaClient, preview] = await Promise.all([
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/pwa/pwa-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/calculator/components/wall-preview.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(pwaClient, /process\.env\.NODE_ENV === "production"/);
  assert.match(pwaClient, /SKIP_WAITING/);
  assert.match(preview, /dynamic\(\s*\(\) => import\("\.\/room-three-scene"/);
});

test("Phase 9 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase9Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(Object.keys(phase9Messages[language]).sort(), [...keys].sort());
    assert.ok(keys.every((key) => phase9Messages[language][key as keyof typeof phase9Messages["en-GB"]].trim().length > 0));
  }
});
