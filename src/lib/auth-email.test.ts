import assert from "node:assert/strict";
import test from "node:test";
import { sendAuthEmail, verificationEmailSubject } from "./auth-email.ts";

const variables = ["RESEND_API_KEY", "AUTH_EMAIL_FROM", "VERIFICATION_PUBLIC_ORIGIN", "NODE_ENV"] as const;
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
  environment.RESEND_API_KEY = "test-key";
  environment.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  environment.VERIFICATION_PUBLIC_ORIGIN = "https://app.example.test";
}

const input = { to: "person@example.test", subject: "Verify", path: "/verify-email?token=opaque", action: "verify", expires: "2026-12-01T00:00:00.000Z" };

test("email sender classifies Resend test-mode recipient rejection without exposing provider text", async () => {
  configured();
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "You can only send testing emails to your own email address" }), { status: 403 });
  try { assert.equal(await sendAuthEmail(input), "recipient_not_allowed"); }
  finally { restore(); }
});

test("email sender classifies rejected senders and malformed public origins safely", async () => {
  configured();
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "The from domain is not verified" }), { status: 422 });
  try {
    assert.equal(await sendAuthEmail(input), "sender_rejected");
    environment.VERIFICATION_PUBLIC_ORIGIN = "https://app.example.test/not-allowed";
    assert.equal(await sendAuthEmail(input), "origin_invalid");
  } finally { restore(); }
});

test("verification email uses the RekApps sender and Kurdish RTL HTML with plain-text fallback", async () => {
  configured();
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: "accepted" }), { status: 200 });
  };
  try {
    assert.equal(await sendAuthEmail({ ...input, subject: "ignored", template: "verification" }), "sent");
    assert.equal(payload?.from, "RekApps <onboarding@resend.dev>");
    assert.equal(payload?.subject, verificationEmailSubject);
    assert.match(String(payload?.html), /lang="ckb" dir="rtl"/);
    assert.match(String(payload?.html), /پشتڕاستکردنەوەی ئیمەیڵ/);
    assert.match(String(payload?.text), /پشتڕاستکردنەوەی ئیمەیڵ/);
    assert.match(String(payload?.text), /token=opaque/);
    assert.doesNotMatch(String(payload?.html), /Continue securely|BlockSystem/);
  } finally { restore(); }
});
