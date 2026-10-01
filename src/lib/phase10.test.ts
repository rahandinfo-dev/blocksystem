import assert from "node:assert/strict";
import test from "node:test";
import { apiError, redactLogValue, requestId, safeIdentifier } from "./observability.ts";
import { liveness, readiness } from "./health.ts";
import { phase10Messages } from "./phase10-messages.ts";

test("health reports application liveness and readiness without configuration", async () => {
  const live = liveness();
  assert.equal(live.status, "ok");
  assert.equal(live.services.application, "ok");
  assert.equal(JSON.stringify(live).match(/secret|token|redisUrl/i), null);
  const ready = await readiness();
  assert.equal(ready.status, "ok");
  assert.deepEqual(ready.services, { application: "ok" });
});

test("structured errors propagate safe request IDs and redact sensitive diagnostics", async () => {
  const request = new Request("https://blocksystem.test/api/test", { headers: { "x-request-id": "request_12345678" } });
  assert.equal(requestId(request), "request_12345678");
  const response = apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-request-id"), "request_12345678");
  assert.deepEqual(await response.json(), { error: { code: "DEPENDENCY_UNAVAILABLE", message: "This service is temporarily unavailable.", requestId: "request_12345678" } });
  const redacted = redactLogValue({ authorization: "Bearer secret", password: "secret", nested: { privateToken: "secret" }, rawToken: "a".repeat(48), reference: "BS-2026-000001" });
  assert.deepEqual(redacted, { authorization: "[REDACTED]", password: "[REDACTED]", nested: { privateToken: "[REDACTED]" }, rawToken: "[REDACTED]", reference: "BS-2026-000001" });
  assert.equal(safeIdentifier("private-token").length, 12);
});


test("Phase 10 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase10Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(Object.keys(phase10Messages[language]).sort(), [...keys].sort());
    assert.ok(keys.every((key) => phase10Messages[language][key as keyof typeof phase10Messages["en-GB"]].trim()));
  }
});
