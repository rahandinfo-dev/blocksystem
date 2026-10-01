import { createHash, randomBytes } from "node:crypto";
import type { VerificationStore } from "./verification-store.ts";

type Purpose = "verify-email" | "reset-password";
type Challenge = { userId: string; purpose: Purpose; expiresAt: string };
const key = (purpose: Purpose, digest: string) => `bs:auth:challenge:${purpose}:${digest}`;
const usedKey = (purpose: Purpose, digest: string) => `bs:auth:challenge-used:${purpose}:${digest}`;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const lifetimeSeconds = (purpose: Purpose) => purpose === "verify-email" ? 24 * 60 * 60 : 2 * 60 * 60;

export type ChallengeConsumption =
  | { status: "valid"; userId: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" };

/** Stores only a SHA-256 digest; bearer tokens exist only in the email link. */
export async function createChallenge(store: VerificationStore, userId: string, purpose: Purpose) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (purpose === "verify-email" ? 24 : 2) * 60 * 60 * 1000).toISOString();
  await store.authSet(key(purpose, digest(token)), JSON.stringify({ userId, purpose, expiresAt } satisfies Challenge));
  return { token, expiresAt };
}

export async function consumeChallenge(store: VerificationStore, token: string, purpose: Purpose): Promise<ChallengeConsumption> {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return { status: "invalid" };
  const valueDigest = digest(token);
  const result = await store.authTake(key(purpose, valueDigest), usedKey(purpose, valueDigest), lifetimeSeconds(purpose));
  if (!result.value) return { status: result.used ? "used" : "invalid" };
  try {
    const challenge = JSON.parse(result.value) as Challenge;
    if (challenge.purpose !== purpose || typeof challenge.userId !== "string") return { status: "invalid" };
    return Date.parse(challenge.expiresAt) > Date.now() ? { status: "valid", userId: challenge.userId } : { status: "expired" };
  } catch { return { status: "invalid" }; }
}

export async function discardChallenge(store: VerificationStore, token: string, purpose: Purpose) {
  const valueDigest = digest(token);
  await store.authDelete(key(purpose, valueDigest));
  await store.authDelete(usedKey(purpose, valueDigest));
}
