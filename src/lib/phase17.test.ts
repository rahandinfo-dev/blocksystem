import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { consumeChallenge, createChallenge } from "./auth-challenges.ts";
import { createUser, getUserByIdentifier, getUserByUsername, verifyUserEmail } from "./auth.ts";
import { phase17Messages } from "./phase17-messages.ts";
import { FileVerificationStore } from "./verification-store.ts";

async function store() { return new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-phase17-"))); }

test("public accounts retain unique normalised usernames and a safe email-verification state", async () => {
  const data = await store();
  const account = await createUser(data, { email: "Engineer@example.test", username: "Engineer.One", displayName: "Engineer One", password: "correct horse battery staple", role: "ENGINEER" });
  assert.equal(account.username, "engineer.one");
  assert.equal(account.emailVerifiedAt, undefined);
  assert.equal((await getUserByUsername(data, "ENGINEER.ONE"))?.id, account.id);
  assert.equal((await getUserByIdentifier(data, "engineer.one"))?.email, "engineer@example.test");
  await assert.rejects(() => createUser(data, { email: "another@example.test", username: "engineer.one", displayName: "Another", password: "correct horse battery staple", role: "ENGINEER" }));
  await verifyUserEmail(data, account.id);
  assert.ok((await getUserByIdentifier(data, "engineer.one"))?.emailVerifiedAt);
});

test("email challenges are random, digest-backed, purpose-bound and single-use", async () => {
  const data = await store();
  const { token } = await createChallenge(data, "11111111-1111-4111-8111-111111111111", "verify-email");
  assert.match(token, /^[A-Za-z0-9_-]{40,80}$/);
  assert.deepEqual(await consumeChallenge(data, token, "reset-password"), { status: "invalid" });
  assert.deepEqual(await consumeChallenge(data, token, "verify-email"), { status: "valid", userId: "11111111-1111-4111-8111-111111111111" });
  assert.deepEqual(await consumeChallenge(data, token, "verify-email"), { status: "used" });
});

test("email challenges preserve URL-safe tokens and classify invalid and expired links", async () => {
  const data = await store();
  const originalNow = Date.now;
  try {
    Date.now = () => 1_000;
    const challenge = await createChallenge(data, "22222222-2222-4222-8222-222222222222", "verify-email");
    const url = new URL(`/verify-email?token=${encodeURIComponent(challenge.token)}`, "https://app.example.test");
    assert.equal(url.searchParams.get("token"), challenge.token);
    assert.deepEqual(await consumeChallenge(data, "not-a-valid-token", "verify-email"), { status: "invalid" });
    Date.now = () => 25 * 60 * 60 * 1000;
    assert.deepEqual(await consumeChallenge(data, challenge.token, "verify-email"), { status: "expired" });
  } finally { Date.now = originalNow; }
});

test("phase 17 account translations remain complete for RTL and LTR interfaces", () => {
  const keys = Object.keys(phase17Messages["en-GB"]).sort();
  for (const language of ["ku", "ar", "en-GB"] as const) assert.deepEqual(Object.keys(phase17Messages[language]).sort(), keys);
});
