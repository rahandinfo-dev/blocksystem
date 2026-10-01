import assert from "node:assert/strict";
import test from "node:test";
import { sendAuthEmail, verificationEmailSubject } from "./auth-email.ts";

const variables = ["MAILERSEND_API_TOKEN", "AUTH_EMAIL_FROM", "VERIFICATION_PUBLIC_ORIGIN", "NODE_ENV", "NEXT_PUBLIC_MAILERSEND_API_TOKEN", "NEXT_PUBLIC_AUTH_EMAIL_FROM"] as const;
const original = Object.fromEntries(variables.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
const environment = process.env as Record<string, string | undefined>;

function restore() {
  for (const name of variables) {
    const value = original[name];
    if (value === undefined) delete environment[name]; else environment[name] = value;
  }
  globalThis.fetch = originalFetch;
}

function configured() {
  environment.NODE_ENV = "production";
  environment.MAILERSEND_API_TOKEN = "test-only-token";
  environment.AUTH_EMAIL_FROM = "verified@example.test";
  environment.VERIFICATION_PUBLIC_ORIGIN = "https://app.example.test";
  delete environment.NEXT_PUBLIC_MAILERSEND_API_TOKEN;
  delete environment.NEXT_PUBLIC_AUTH_EMAIL_FROM;
}

const input = { to: "person@example.test", subject: "Verify", path: "/verify-email?token=opaque", action: "verify", expires: "2026-12-01T00:00:00.000Z" };

test("MailerSend provider failures are safely classified", async () => {
  configured();
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "Sandbox account unique recipients limit reached" }), { status: 422 });
    assert.equal(await sendAuthEmail(input), "sandbox_restricted");
    globalThis.fetch = async () => new Response(JSON.stringify({ errors: { "to.0.email": ["The email must be a valid email address."] } }), { status: 422 });
    assert.equal(await sendAuthEmail(input), "invalid_recipient");
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "Too many requests" }), { status: 429 });
    assert.equal(await sendAuthEmail(input), "rate_limited");
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    assert.equal(await sendAuthEmail(input), "unavailable");
  } finally { restore(); }
});

test("MailerSend sends registration/resend verification and reset emails with server-only credentials", async () => {
  configured();
  let endpoint = "";
  let headers: Headers | undefined;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (url, init) => {
    endpoint = String(url);
    headers = new Headers(init?.headers);
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(null, { status: 202, headers: { "x-message-id": "accepted" } });
  };
  try {
    assert.equal(await sendAuthEmail({ ...input, subject: "ignored", template: "verification" }), "sent");
    assert.equal(endpoint, "https://api.mailersend.com/v1/email");
    assert.equal(headers?.get("authorization"), "Bearer test-only-token");
    assert.equal(headers?.get("x-requested-with"), "XMLHttpRequest");
    assert.deepEqual(payload?.from, { email: "verified@example.test", name: "RekApps" });
    assert.deepEqual(payload?.to, [{ email: "person@example.test" }]);
    assert.equal(payload?.subject, verificationEmailSubject);
    assert.match(String(payload?.html), /lang="ckb" dir="rtl"/);
    assert.match(String(payload?.html), /بەخێربێیت بۆ RekApps/);
    assert.match(String(payload?.html), /پشتڕاستکردنەوەی ئیمەیڵ/);
    assert.match(String(payload?.text), /پشتڕاستکردنەوەی ئیمەیڵ/);
    assert.match(String(payload?.text), /token=opaque/);
    assert.doesNotMatch(String(payload?.html), /test-only-token|Continue securely|BlockSystem/);
    assert.doesNotMatch(JSON.stringify(payload), /test-only-token/);
    assert.equal(await sendAuthEmail({ ...input, subject: "Reset your RekApps password", path: "/reset-password?token=reset-opaque", action: "reset your password" }), "sent");
    assert.match(String(payload?.text), /reset-password\?token=reset-opaque/);
    assert.match(String(payload?.html), /reset your password/);
  } finally { restore(); }
});

test("MailerSend configuration is fail-closed and verification links retain their secure origin", async () => {
  configured();
  try {
    environment.NEXT_PUBLIC_MAILERSEND_API_TOKEN = "public-value";
    assert.equal(await sendAuthEmail(input), "not_configured");
    delete environment.NEXT_PUBLIC_MAILERSEND_API_TOKEN;
    environment.VERIFICATION_PUBLIC_ORIGIN = "https://app.example.test/not-allowed";
    assert.equal(await sendAuthEmail(input), "origin_invalid");
    environment.VERIFICATION_PUBLIC_ORIGIN = "https://app.example.test";
    assert.equal(await sendAuthEmail({ ...input, to: "not-an-email" }), "invalid_recipient");
  } finally { restore(); }
});
