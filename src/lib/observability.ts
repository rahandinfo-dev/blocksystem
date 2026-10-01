import { createHash, randomUUID } from "node:crypto";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";
export type LogLevel = "debug" | "info" | "warn" | "error";

const sensitive = /authorization|cookie|password|secret|token|credential|snapshot|projectdata|backup|redis/i;
const safeRequestId = /^[A-Za-z0-9_-]{8,80}$/;
const messages: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "The request could not be processed.",
  NOT_FOUND: "The requested resource was not found.",
  UNAUTHORIZED: "Authentication is required.",
  FORBIDDEN: "This action is not permitted.",
  RATE_LIMITED: "Please wait before trying again.",
  CONFLICT: "This action has already been processed.",
  NETWORK_ERROR: "The network request did not complete.",
  DEPENDENCY_UNAVAILABLE: "This service is temporarily unavailable.",
  INTERNAL_ERROR: "This service is temporarily unavailable.",
};

export function requestId(request?: Request): string {
  const incoming = request?.headers.get("x-request-id")?.trim();
  return incoming && safeRequestId.test(incoming) ? incoming : randomUUID();
}
export function safeIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") return value.length > 160 || /^(?:bearer\s+|[a-f0-9]{40,}$)/i.test(value) ? "[REDACTED]" : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactLogValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sensitive.test(key) ? "[REDACTED]" : redactLogValue(item, depth + 1)]));
  }
  return value;
}
export function log(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...redactLogValue(context) as object });
  console[level === "debug" ? "debug" : level](entry);
}
export function registrationFailure(request: Request, category: string, status = 503) {
  const id = requestId(request);
  log("error", "auth.registration_failed", { category, requestId: id });
  return Response.json({ error: { code: category, requestId: id } }, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
}
export function apiError(
  code: ApiErrorCode,
  status: number,
  request?: Request,
  extraHeaders: HeadersInit = {},
) {
  const id = requestId(request);
  return Response.json(
    { error: { code, message: messages[code], requestId: id } },
    { status, headers: { "Cache-Control": "no-store", "X-Request-ID": id, ...extraHeaders } },
  );
}
export function apiHeaders(request?: Request, extraHeaders: HeadersInit = {}) {
  return { "Cache-Control": "no-store", "X-Request-ID": requestId(request), ...extraHeaders };
}
