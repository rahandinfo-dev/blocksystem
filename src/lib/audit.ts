import { createHash, randomUUID } from "node:crypto";

export type AuditAction =
  | "verification.created"
  | "verification.revoked"
  | "document.exported"
  | "admin.signed-in"
  | "backup.created"
  | "backup.restored"
  | "project.deleted"
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.logout"
  | "auth.user.created"
  | "auth.user.updated"
  | "auth.user.disabled"
  | "auth.permission.denied";
export type AuditEvent = {
  id: string;
  action: AuditAction;
  timestamp: string;
  entityType: "project" | "document" | "verification" | "backup" | "admin" | "user" | "auth";
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
