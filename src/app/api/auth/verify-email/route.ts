import { auditEvent } from "@/lib/audit";
import { consumeChallenge } from "@/lib/auth-challenges";
import { verifyUserEmail } from "@/lib/auth";
import { apiError, apiHeaders } from "@/lib/observability";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function POST(request: Request) { if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request); try { const body = await limitedJson(request) as { token?: unknown }; const store = verificationStore(); const id = typeof body.token === "string" ? await consumeChallenge(store, body.token, "verify-email") : null; const user = id ? await verifyUserEmail(store, id) : null; if (!user) return apiError("VALIDATION_ERROR", 400, request); await store.appendAudit(auditEvent({ action: "auth.user.updated", entityType: "user", entityReference: user.id, result: "success", context: { event: "email_verified" } })); return Response.json({ verified: true }, { headers: apiHeaders(request) }); } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); } }
