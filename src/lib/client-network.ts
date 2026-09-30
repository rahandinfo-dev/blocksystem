import { canRetryRequest } from "./pwa-policy";

type RetryOptions = RequestInit & { retries?: number; timeoutMs?: number };

/** Retries only idempotent reads; writes must always be explicitly retried by the user. */
export async function fetchWithSafeRetry(
  input: RequestInfo | URL,
  { retries = 1, timeoutMs = 8_000, ...init }: RetryOptions = {},
): Promise<Response> {
  const method = init.method ?? "GET";
  const attempts = canRetryRequest(method) ? Math.max(0, Math.min(retries, 2)) + 1 : 1;
  let failure: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, method, signal: controller.signal });
    } catch (error) {
      failure = error;
      if (attempt + 1 < attempts) await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw failure instanceof Error ? failure : new Error("Network request failed");
}
