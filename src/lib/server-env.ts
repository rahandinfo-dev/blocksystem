/** Server-only configuration. Values are deliberately never returned to clients. */
import { log, requestId } from "./observability.ts";
export type VerificationEnvironment = {
  production: boolean;
  redisUrl?: string;
  redisToken?: string;
  adminSecret?: string;
  publicOrigin?: string;
};

export type ServerConfigurationCode =
  | "REDIS_NOT_CONFIGURED"
  | "REDIS_CONFIGURATION_INVALID"
  | "VERIFICATION_ORIGIN_INVALID"
  | "VERIFICATION_ADMIN_CONFIGURATION_INVALID";

/** A safe, server-only category; its message deliberately contains no value. */
export class ServerConfigurationError extends Error {
  readonly code: ServerConfigurationCode;
  constructor(code: ServerConfigurationCode) {
    super(code);
    this.name = "ServerConfigurationError";
    this.code = code;
  }
}

const protectedNames = [
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "VERIFICATION_ADMIN_SECRET",
  "MAILERSEND_API_TOKEN",
] as const;
function validOrigin(value: string, production: boolean) {
  let url: URL;
  try { url = new URL(value); } catch { throw new ServerConfigurationError("VERIFICATION_ORIGIN_INVALID"); }
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
    throw new ServerConfigurationError("VERIFICATION_ORIGIN_INVALID");
  return url.origin;
}
export function verificationEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): VerificationEnvironment {
  for (const name of protectedNames)
    if (env[`NEXT_PUBLIC_${name}`])
      throw new ServerConfigurationError("REDIS_CONFIGURATION_INVALID");
  const production = env.NODE_ENV === "production" || Boolean(env.VERCEL);
  // Select whole credential pairs. Mixing a URL from one provider with a token
  // from another produces an opaque production failure and is never valid.
  const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN);
  const redisUrl = hasUpstash ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL;
  const redisToken = hasUpstash ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN;
  const adminSecret = env.VERIFICATION_ADMIN_SECRET;
  const publicOrigin = env.VERIFICATION_PUBLIC_ORIGIN;
  if (redisUrl) {
    let url: URL;
    try { url = new URL(redisUrl); } catch { throw new ServerConfigurationError("REDIS_CONFIGURATION_INVALID"); }
    if (url.protocol !== "https:" || url.username || url.password)
      throw new ServerConfigurationError("REDIS_CONFIGURATION_INVALID");
  }
  if (adminSecret && adminSecret.length < 32)
    throw new ServerConfigurationError("VERIFICATION_ADMIN_CONFIGURATION_INVALID");
  if (publicOrigin) validOrigin(publicOrigin, production);
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

/**
 * Authentication and document storage need a writable Redis REST credential.
 * `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, and `REDIS_URL` are intentionally
 * not fallbacks: this adapter performs writes over HTTPS REST and must not
 * silently select a read-only credential or a TCP URL in serverless runtime.
 */
export function redisRestEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const config = verificationEnvironment(env);
  if (Boolean(config.redisUrl) !== Boolean(config.redisToken))
    throw new ServerConfigurationError("REDIS_CONFIGURATION_INVALID");
  if (!config.redisUrl || !config.redisToken)
    throw new ServerConfigurationError("REDIS_NOT_CONFIGURED");
  return { url: config.redisUrl, token: config.redisToken };
}
export function safeServerError(error: unknown, request?: Request) {
  log("error", "server.operation_failed", {
    error: error instanceof Error ? error.name : "UnknownError",
    requestId: request ? requestId(request) : undefined,
  });
}
