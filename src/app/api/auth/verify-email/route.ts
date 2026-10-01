import { auditEvent } from "@/lib/audit";
import { consumeChallenge } from "@/lib/auth-challenges";
import { getUser, verifyUserEmail } from "@/lib/auth";
import { apiError, apiHeaders, log, requestId } from "@/lib/observability";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const body = await limitedJson(request) as { token?: unknown };
    if (typeof body.token !== "string") return apiError("EMAIL_VERIFICATION_INVALID", 400, request);
    const store = verificationStore();
    const challenge = await consumeChallenge(store, body.token, "verify-email");
    if (challenge.status === "invalid") return apiError("EMAIL_VERIFICATION_INVALID", 400, request);
    if (challenge.status === "expired") return apiError("EMAIL_VERIFICATION_EXPIRED", 410, request);
    if (challenge.status === "used") return apiError("EMAIL_VERIFICATION_ALREADY_USED", 409, request);
    const account = await getUser(store, challenge.userId);
    if (!account) return apiError("EMAIL_VERIFICATION_INVALID", 400, request);
    if (account.emailVerifiedAt && !account.emailVerificationRequired)
      return apiError("EMAIL_VERIFICATION_ALREADY_VERIFIED", 409, request);
    const user = await verifyUserEmail(store, account.id);
    if (!user) return apiError("EMAIL_VERIFICATION_INVALID", 400, request);
    try {
      await store.appendAudit(auditEvent({ action: "auth.user.updated", entityType: "user", entityReference: user.id, result: "success", context: { event: "email_verified" } }));
    } catch { log("warn", "auth.email_verification_audit_failed", { category: "AUDIT_WRITE_UNAVAILABLE", requestId: requestId(request) }); }
    return Response.json({ verified: true }, { headers: apiHeaders(request) });
  } catch {
    log("error", "auth.email_verification_failed", { category: "VERIFICATION_STORAGE_UNAVAILABLE", requestId: requestId(request) });
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
