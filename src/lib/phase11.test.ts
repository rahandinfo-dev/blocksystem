import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { auditEvent, requestIpFingerprint } from "./audit.ts";
import { authenticatedUser, authEnvironment, canAccessProject, createSession, createUser, getUserByEmail, grantProjectAccess, hasPermission, passwordMatches, updateUser } from "./auth.ts";
import { permissions, roles } from "./auth-types.ts";
import { phase11Messages } from "./phase11-messages.ts";
import { enforceRateLimit, enforceSignupRateLimit } from "./rate-limit.ts";
import { FileVerificationStore } from "./verification-store.ts";

const secret = "phase11-test-session-secret-at-least-thirty-two-characters";
async function store() { return new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-auth-"))); }

test("persistent users use salted hashes and only expose safe identity fields", async () => {
  const data = await store();
  const created = await createUser(data, { email: "admin@example.test", displayName: "Admin", password: "correct horse battery staple", role: "SUPER_ADMIN" });
  assert.equal("passwordHash" in created, false);
  const record = await getUserByEmail(data, "ADMIN@example.test");
  assert.ok(record?.passwordHash.startsWith("scrypt$"));
  assert.equal(await passwordMatches("correct horse battery staple", record?.passwordHash ?? ""), true);
  assert.equal(await passwordMatches("incorrect", record?.passwordHash ?? ""), false);
});

test("sessions expire, sign-out revocation and disabled users invalidate server access", async () => {
  const data = await store();
  const safe = await createUser(data, { email: "engineer@example.test", displayName: "Engineer", password: "correct horse battery staple", role: "ENGINEER" });
  const user = await getUserByEmail(data, safe.email); assert.ok(user);
  const cookie = await createSession(data, user, secret);
  const request = new Request("https://blocksystem.test", { headers: { cookie } });
  assert.equal((await authenticatedUser(data, request, secret))?.id, safe.id);
  await updateUser(data, safe.id, { status: "DISABLED" });
  assert.equal(await authenticatedUser(data, request, secret), null);
});

test("roles provide centralized grants and deny viewer administration", () => {
  assert.deepEqual(roles, ["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "VIEWER"]);
  assert.equal(hasPermission("SUPER_ADMIN", "system.admin"), true);
  assert.equal(hasPermission("ADMIN", "users.create"), true);
  assert.equal(hasPermission("MANAGER", "documents.revoke"), false);
  assert.equal(hasPermission("ENGINEER", "users.read"), false);
  assert.equal(hasPermission("VIEWER", "projects.update"), false);
  assert.ok(permissions.VIEWER.includes("projects.read"));
});

test("resource membership prevents cross-project access after assignment", async () => {
  const data = await store();
  const one = await createUser(data, { email: "one@example.test", displayName: "One", password: "correct horse battery staple", role: "ENGINEER" });
  const two = await createUser(data, { email: "two@example.test", displayName: "Two", password: "correct horse battery staple", role: "ENGINEER" });
  await grantProjectAccess(data, "project_1", one.id);
  assert.equal(await canAccessProject(data, one, "project_1"), true);
  assert.equal(await canAccessProject(data, two, "project_1"), false);
});

test("login throttling and safe audit filtering do not retain secrets", async () => {
  const data = await store(); const request = new Request("https://blocksystem.test/api/auth/session", { headers: { "x-real-ip": "198.51.100.1" } });
  for (let index = 0; index < 8; index += 1) assert.equal(await enforceRateLimit(data, request, "login"), true);
  assert.equal(await enforceRateLimit(data, request, "login"), false);
  const event = auditEvent({ action: "auth.login.failure", entityType: "auth", result: "failure", context: { emailHash: "abc", password: "no", token: "no" } });
  assert.equal(event.context?.emailHash, "abc");
  assert.equal(Object.keys(event.context ?? {}).length, 1);
});

test("signup limits an address independently and uses Vercel's client address for network abuse protection", async () => {
  const data = await store();
  const request = new Request("https://blocksystem.test/api/auth/register", { headers: { "x-vercel-forwarded-for": "198.51.100.24", "x-forwarded-for": "203.0.113.9" } });
  const proxyEquivalent = new Request("https://blocksystem.test/api/auth/register", { headers: { "x-real-ip": "198.51.100.24" } });
  assert.equal(requestIpFingerprint(request), requestIpFingerprint(proxyEquivalent));

  for (let index = 0; index < 5; index += 1)
    assert.equal((await enforceSignupRateLimit(data, request, "person@gmail.com")).allowed, true);
  assert.deepEqual(await enforceSignupRateLimit(data, request, "person@gmail.com"), { allowed: false, retryAfterSeconds: 3600, category: "SIGNUP_EMAIL_LIMIT" });
  assert.equal((await enforceSignupRateLimit(data, request, "other@outlook.com")).allowed, true);

  const networkData = await store();
  for (let index = 0; index < 25; index += 1)
    assert.equal((await enforceSignupRateLimit(networkData, request, `person${index}@example.test`)).allowed, true);
  assert.deepEqual(await enforceSignupRateLimit(networkData, request, "overflow@example.test"), { allowed: false, retryAfterSeconds: 3600, category: "SIGNUP_NETWORK_LIMIT" });
});

test("auth environment refuses public or incomplete secrets and translations are complete", () => {
  assert.throws(() => authEnvironment({ AUTH_SESSION_SECRET: "short" } as unknown as NodeJS.ProcessEnv), /incomplete/);
  assert.throws(() => authEnvironment({ AUTH_SESSION_SECRET: secret, NEXT_PUBLIC_AUTH_SESSION_SECRET: secret } as unknown as NodeJS.ProcessEnv), /publicly/);
  const keys = Object.keys(phase11Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) assert.deepEqual(Object.keys(phase11Messages[language]).sort(), [...keys].sort());
});
