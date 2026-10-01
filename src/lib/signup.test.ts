import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { consumeChallenge } from "./auth-challenges.ts";
import { getUserByEmail, getUserByUsername, verifyUserEmail } from "./auth.ts";
import { passwordRequirements, passwordStrength } from "./password-policy.ts";
import { registerAccount } from "./signup.ts";
import { FileVerificationStore } from "./verification-store.ts";

async function store() { return new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-signup-"))); }
const validInput = { displayName: "Engineer One", username: "Engineer.One", email: "Engineer@example.test", password: "Passphrase9!", confirmPassword: "Passphrase9!" };

test("password policy and strength states are shared by signup", () => {
  assert.equal(passwordRequirements("short").valid, false);
  assert.equal(passwordRequirements("longenoughpassword").valid, false);
  assert.equal(passwordRequirements("Password123!").valid, true);
  assert.equal(passwordRequirements("correct horse battery staple").valid, true);
  assert.equal(passwordStrength("short"), "weak");
  assert.equal(passwordStrength("longenoughpassword"), "medium");
  assert.equal(passwordStrength("Password123!"), "strong");
  assert.equal(passwordStrength("MuchLongerPassword123!"), "veryStrong");
});

test("valid signup normalizes identity, sends verification and verifies the account", async () => {
  const data = await store();
  let token = "";
  const result = await registerAccount(data, validInput, async (email) => { token = email.token; return "sent"; });
  assert.equal(result.ok, true);
  assert.ok(token);
  const user = await getUserByEmail(data, " engineer@EXAMPLE.test ");
  assert.equal(user?.username, "engineer.one");
  assert.deepEqual(await consumeChallenge(data, token, "verify-email"), { status: "valid", userId: user?.id });
  assert.ok(user && await verifyUserEmail(data, user.id));
  assert.ok((await getUserByUsername(data, "ENGINEER.ONE"))?.emailVerifiedAt);
});

test("signup rejects invalid passwords, mismatches and duplicate normalized identities", async () => {
  const data = await store();
  assert.deepEqual(await registerAccount(data, { ...validInput, password: "not-long-enough", confirmPassword: "not-long-enough" }, async () => "sent"), { ok: false, code: "PASSWORD_INVALID" });
  assert.deepEqual(await registerAccount(data, { ...validInput, confirmPassword: "different" }, async () => "sent"), { ok: false, code: "PASSWORD_MISMATCH" });
  assert.equal((await registerAccount(data, validInput, async () => "sent")).ok, true);
  assert.deepEqual(await registerAccount(data, { ...validInput, username: "OtherUser", email: " ENGINEER@EXAMPLE.TEST " }, async () => "sent"), { ok: false, code: "EMAIL_TAKEN" });
  assert.deepEqual(await registerAccount(data, { ...validInput, username: "ENGINEER.ONE", email: "other@example.test" }, async () => "sent"), { ok: false, code: "USERNAME_TAKEN" });
});

test("signup rolls back an unverified account when email delivery is unavailable and permits a retry", async () => {
  const data = await store();
  const result = await registerAccount(data, validInput, async () => "unavailable");
  assert.deepEqual(result, { ok: false, code: "EMAIL_DELIVERY_UNAVAILABLE" });
  assert.equal(await getUserByEmail(data, validInput.email), null);
  assert.equal((await registerAccount(data, validInput, async () => "sent")).ok, true);
});

test("signup reports safe Resend delivery categories and rolls each account back", async () => {
  const outcomes = [
    ["not_configured", "EMAIL_NOT_CONFIGURED"],
    ["origin_invalid", "EMAIL_ORIGIN_INVALID"],
    ["sender_rejected", "EMAIL_SENDER_REJECTED"],
    ["recipient_not_allowed", "EMAIL_RECIPIENT_NOT_ALLOWED"],
  ] as const;
  for (const [delivery, code] of outcomes) {
    const data = await store();
    assert.deepEqual(await registerAccount(data, validInput, async () => delivery), { ok: false, code });
    assert.equal(await getUserByEmail(data, validInput.email), null);
  }
});

test("signup safely repairs an orphaned identity index left by an interrupted legacy write", async () => {
  const data = await store();
  await data.authSet("bs:auth:email:engineer@example.test", "00000000-0000-0000-0000-000000000000");
  assert.equal((await registerAccount(data, validInput, async () => "sent")).ok, true);
  assert.ok(await getUserByEmail(data, validInput.email));
});
