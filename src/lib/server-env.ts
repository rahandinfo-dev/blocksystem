/** Server-only configuration. Values are deliberately never returned to clients. */
import { log, requestId } from "./observability.ts";
export type VerificationEnvironment = {
  production: boolean;
  redisUrl?: string;
  redisToken?: string;
  adminSecret?: string;
  publicOrigin?: string;
};

const protectedNames = [
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "VERIFICATION_ADMIN_SECRET",
] as const;
function validOrigin(value: string, production: boolean) {
  const url = new URL(value);
  const local =
    !production && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid verification public origin");
  return url.origin;
}
export function verificationEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): VerificationEnvironment {
  for (const name of protectedNames)
    if (env[`NEXT_PUBLIC_${name}`])
      throw new Error("Verification secret is publicly configured");
  const production = env.NODE_ENV === "production" || Boolean(env.VERCEL);
  // Upstash names take precedence; Vercel KV exposes the compatible fallback names.
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const adminSecret = env.VERIFICATION_ADMIN_SECRET;
  const publicOrigin = env.VERIFICATION_PUBLIC_ORIGIN;
  if (redisUrl) {
    const url = new URL(redisUrl);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("Invalid verification database URL");
  }
  if (adminSecret && adminSecret.length < 32)
    throw new Error("Invalid verification administrator secret");
  if (publicOrigin) validOrigin(publicOrigin, production);
  if (production && (!redisUrl || !redisToken || !adminSecret || !publicOrigin))
    throw new Error("Verification production configuration is incomplete");
  return {
    production,
    redisUrl,
    redisToken,
    adminSecret,
    publicOrigin: publicOrigin
      ? validOrigin(publicOrigin, production)
      : undefined,
  };
}
export function safeServerError(error: unknown, request?: Request) {
  log("error", "server.operation_failed", {
    error: error instanceof Error ? error.name : "UnknownError",
    requestId: request ? requestId(request) : undefined,
  });
}
