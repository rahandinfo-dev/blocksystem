import { auditEvent } from "@/lib/audit";
import { consumeChallenge } from "@/lib/auth-challenges";
import { resetUserPassword } from "@/lib/auth";
import { apiError, apiHeaders } from "@/lib/observability";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function POST(request: Request) { if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request); try { const body = await limitedJson(request) as { token?: unknown; password?: unknown; confirmPassword?: unknown }; if (typeof body.token !== "string" || typeof body.password !== "string" || body.password !== body.confirmPassword) return apiError("VALIDATION_ERROR", 400, request); const store = verificationStore(); const id = await consumeChallenge(store, body.token, "reset-password"); if (!id || !(await resetUserPassword(store, id, body.password))) return apiError("VALIDATION_ERROR", 400, request); await store.appendAudit(auditEvent({ action: "auth.user.updated", entityType: "user", entityReference: id, result: "success", context: { event: "password_changed" } })); return Response.json({ reset: true }, { headers: apiHeaders(request) }); } catch { return apiError("VALIDATION_ERROR", 400, request); } }
