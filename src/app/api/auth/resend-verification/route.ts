import { auditEvent } from "@/lib/audit";
import { getUserByEmail } from "@/lib/auth";
import { createChallenge, discardChallenge } from "@/lib/auth-challenges";
import { sendAuthEmail, verificationEmailSubject } from "@/lib/auth-email";
import { normalizeEmail, validEmail } from "@/lib/identity";
import { apiError, apiHeaders, log, requestId } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailDeliveryFailure } from "@/lib/signup";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "verification-resend"))) return apiError("RATE_LIMITED", 429, request);
    const body = await limitedJson(request) as { email?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    // Avoid account enumeration; only an existing, pending account receives an email.
    if (!validEmail(email)) return Response.json({ accepted: true }, { headers: apiHeaders(request) });
    const user = await getUserByEmail(store, email);
    if (!user || user.emailVerifiedAt || !user.emailVerificationRequired)
      return Response.json({ accepted: true }, { headers: apiHeaders(request) });

    const challenge = await createChallenge(store, user.id, "verify-email");
    const delivery = await sendAuthEmail({
      to: user.email,
      subject: verificationEmailSubject,
      path: `/verify-email?token=${encodeURIComponent(challenge.token)}`,
      action: "verify your email address",
      expires: challenge.expiresAt,
      template: "verification",
    });
    if (delivery !== "sent") {
      await discardChallenge(store, challenge.token, "verify-email");
      const code = emailDeliveryFailure(delivery);
      const status = code === "EMAIL_PROVIDER_RATE_LIMITED" ? 429 : 503;
      const id = requestId(request);
      return Response.json({ error: { code, requestId: id } }, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
    }
    await store.appendAudit(auditEvent({ action: "auth.user.updated", entityType: "user", entityReference: user.id, result: "success", context: { event: "verification_email_resent", emailDelivery: "accepted" } }));
    return Response.json({ accepted: true }, { headers: apiHeaders(request) });
  } catch {
    log("warn", "auth.verification_resend_failed", { category: "VERIFICATION_RESEND_UNAVAILABLE", requestId: requestId(request) });
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
