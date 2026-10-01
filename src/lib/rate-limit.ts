import type { VerificationStore } from "./verification-store.ts";
import { identifierFingerprint, requestFingerprint, requestIpFingerprint } from "./audit.ts";
export const ratePolicy = {
  public: [60, 60],
  admin: [30, 60],
  revoke: [10, 60],
  document: [30, 60],
  login: [8, 300],
  "password-reset": [5, 3600],
  collaboration: [60, 60],
  comment: [20, 60],
  memberSearch: [30, 60],
} as const;

const signupIdentityPolicy = [5, 3600] as const;
const signupNetworkPolicy = [25, 3600] as const;

export type SignupRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  category?: "SIGNUP_EMAIL_LIMIT" | "SIGNUP_NETWORK_LIMIT";
};

/**
 * Signup has two independent limits.  The identity limit prevents repeated
 * verification sends for one address, while the much broader network limit
 * protects the endpoint without letting a shared office/mobile network lock
 * every other person's email address.
 */
export async function enforceSignupRateLimit(
  store: VerificationStore,
  request: Request,
  normalizedEmail?: string,
): Promise<SignupRateLimitResult> {
  const ip = requestIpFingerprint(request);
  if (ip) {
    const [limit, seconds] = signupNetworkPolicy;
    if (!(await store.rateLimit(`signup-network:${ip}`, limit, seconds)))
      return { allowed: false, retryAfterSeconds: seconds, category: "SIGNUP_NETWORK_LIMIT" };
  }
  if (normalizedEmail) {
    const [limit, seconds] = signupIdentityPolicy;
    if (!(await store.rateLimit(`signup-email:${identifierFingerprint(normalizedEmail)}`, limit, seconds)))
      return { allowed: false, retryAfterSeconds: seconds, category: "SIGNUP_EMAIL_LIMIT" };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
export async function enforceRateLimit(
  store: VerificationStore,
  request: Request,
  policy: keyof typeof ratePolicy,
) {
  const [limit, seconds] = ratePolicy[policy];
  return store.rateLimit(
    `${policy}:${requestFingerprint(request)}`,
    limit,
    seconds,
  );
}
