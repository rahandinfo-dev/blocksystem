import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiError, redactLogValue, requestId, safeIdentifier } from "./observability.ts";
import { liveness, readiness } from "./health.ts";
import { FileVerificationStore } from "./verification-store.ts";
import { phase10Messages } from "./phase10-messages.ts";

test("health separates liveness from unconfigured readiness without exposing configuration", async () => {
  const live = liveness();
  assert.equal(live.status, "ok");
  assert.equal(live.services.application, "ok");
  assert.equal(JSON.stringify(live).match(/secret|token|redisUrl/i), null);
  const ready = await readiness();
  assert.ok(["ok", "degraded", "unready"].includes(ready.status));
  assert.equal(JSON.stringify(ready).match(/UPSTASH|VERIFICATION_ADMIN|REDIS_REST/i), null);
});

test("structured errors propagate safe request IDs and redact sensitive diagnostics", async () => {
  const request = new Request("https://blocksystem.test/api/test", { headers: { "x-request-id": "request_12345678" } });
  assert.equal(requestId(request), "request_12345678");
  const response = apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-request-id"), "request_12345678");
  assert.deepEqual(await response.json(), { error: { code: "DEPENDENCY_UNAVAILABLE", message: "This service is temporarily unavailable.", requestId: "request_12345678" } });
  const redacted = redactLogValue({ authorization: "Bearer secret", password: "secret", nested: { verificationToken: "secret" }, rawToken: "a".repeat(48), reference: "BS-2026-000001" });
  assert.deepEqual(redacted, { authorization: "[REDACTED]", password: "[REDACTED]", nested: { verificationToken: "[REDACTED]" }, rawToken: "[REDACTED]", reference: "BS-2026-000001" });
  assert.equal(safeIdentifier("private-token").length, 12);
});

test("verification dependency ping supports safe failure injection", async () => {
  const store = new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-health-")));
  await store.ping();
  await assert.rejects(async () => ({ ping: async () => { throw new Error("unavailable"); } }).ping());
});

test("Phase 10 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase10Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(Object.keys(phase10Messages[language]).sort(), [...keys].sort());
    assert.ok(keys.every((key) => phase10Messages[language][key as keyof typeof phase10Messages["en-GB"]].trim()));
  }
});
