import { createHash, randomBytes } from "node:crypto";
import type { VerificationStore } from "./verification-store.ts";

type Purpose = "verify-email" | "reset-password";
type Challenge = { userId: string; purpose: Purpose; expiresAt: string };
const key = (purpose: Purpose, digest: string) => `bs:auth:challenge:${purpose}:${digest}`;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Stores only a SHA-256 digest; bearer tokens exist only in the email link. */
export async function createChallenge(store: VerificationStore, userId: string, purpose: Purpose) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (purpose === "verify-email" ? 24 : 2) * 60 * 60 * 1000).toISOString();
  await store.authSet(key(purpose, digest(token)), JSON.stringify({ userId, purpose, expiresAt } satisfies Challenge));
  return { token, expiresAt };
}

export async function consumeChallenge(store: VerificationStore, token: string, purpose: Purpose): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  const storageKey = key(purpose, digest(token));
  const raw = await store.authGet(storageKey);
  await store.authDelete(storageKey);
  if (!raw) return null;
  try {
    const challenge = JSON.parse(raw) as Challenge;
    return challenge.purpose === purpose && typeof challenge.userId === "string" && Date.parse(challenge.expiresAt) > Date.now() ? challenge.userId : null;
  } catch { return null; }
}

export async function discardChallenge(store: VerificationStore, token: string, purpose: Purpose) {
  await store.authDelete(key(purpose, digest(token)));
}
