import type { VerificationStore } from "./verification-store.ts";
import { requestFingerprint } from "./audit.ts";
export const ratePolicy = {
  public: [60, 60],
  admin: [30, 60],
  revoke: [10, 60],
  document: [30, 60],
  login: [8, 300],
} as const;
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
