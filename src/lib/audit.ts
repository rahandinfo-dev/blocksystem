import { createHash, randomUUID } from "node:crypto";

export type AuditAction =
  | "verification.created"
  | "verification.revoked"
  | "document.exported"
  | "admin.signed-in"
  | "backup.created"
  | "backup.restored"
  | "project.deleted"
  | "project.created"
  | "project.updated"
export type AuditEvent = {
  id: string;
  action: AuditAction;
  timestamp: string;
  entityType: "project" | "document" | "verification" | "backup" | "admin";
  entityReference?: string;
  result: "success" | "failure";
  context?: Record<string, string | number | boolean>;
};
const sensitive =
  /password|secret|token|credential|authorization|cookie|snapshot|client|owner|location|notes/i;
export function safeAuditContext(
  value: unknown,
): Record<string, string | number | boolean> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const result: Record<string, string | number | boolean> = Object.create(null);
  for (const [key, raw] of Object.entries(value as Record<string, unknown>))
    if (
      !sensitive.test(key) &&
      (typeof raw === "string" ||
        typeof raw === "number" ||
        typeof raw === "boolean") &&
      String(raw).length <= 160
    )
      result[key] = raw;
  return Object.keys(result).length ? result : undefined;
}
export function auditEvent(
  input: Omit<AuditEvent, "id" | "timestamp" | "context"> & {
    context?: unknown;
  },
): AuditEvent {
  const { context, ...event } = input;
  const safe = safeAuditContext(context);
  return {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...(safe ? { context: safe } : {}),
  };
}
export function requestFingerprint(request: Request) {
  const source =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    `${request.headers.get("user-agent")?.slice(0, 120) ?? "unknown"}|${request.headers.get("accept-language")?.slice(0, 64) ?? ""}`;
  return createHash("sha256").update(source).digest("hex").slice(0, 32);
}

/**
 * Returns the platform supplied public address when one is available.
 *
 * Vercel overwrites x-forwarded-for and also supplies the two Vercel aliases,
 * so they are suitable for a network-wide abuse limit.  Do not fall back to
 * user-agent/language here: that fallback groups unrelated people together.
 */
export function requestIpFingerprint(request: Request) {
  const candidate = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ].find((value) => value?.trim())?.split(",")[0]?.trim();
  if (!candidate || candidate.length > 64) return undefined;
  return createHash("sha256").update(candidate).digest("hex").slice(0, 32);
}

/** Hashes an already-normalized identifier before it is used as a KV key. */
export function identifierFingerprint(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 32);
}
