import { auditEvent } from "@/lib/audit";
import { sendAuthEmail, verificationEmailSubject } from "@/lib/auth-email";
import { apiError, apiHeaders, log, registrationFailure, requestId } from "@/lib/observability";
import { enforceSignupRateLimit } from "@/lib/rate-limit";
import { normalizeEmail, validEmail } from "@/lib/identity";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
import { registerAccount, type RegistrationInput } from "@/lib/signup";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const body = await limitedJson(request) as Record<string, unknown>;
    if (!["displayName", "username", "email", "password", "confirmPassword"].every((key) => typeof body[key] === "string")) return Response.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400, headers: apiHeaders(request) });
    const store = verificationStore();
    const email = normalizeEmail(body.email as string);
    const rate = await enforceSignupRateLimit(store, request, validEmail(email) ? email : undefined);
    if (!rate.allowed) {
      const id = requestId(request);
      log("warn", "auth.registration_rate_limited", { category: rate.category ?? "SIGNUP_RATE_LIMIT", requestId: id });
      return Response.json(
        { error: { code: "RATE_LIMITED", requestId: id, retryAfterSeconds: rate.retryAfterSeconds } },
        { status: 429, headers: { ...apiHeaders(request), "X-Request-ID": id, "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }
    const result = await registerAccount(store, body as RegistrationInput, ({ to, token, expiresAt }) => sendAuthEmail({ to, subject: verificationEmailSubject, path: `/verify-email?token=${encodeURIComponent(token)}`, action: "verify your email address", expires: expiresAt, template: "verification" }));
    if (!result.ok) {
      const status = result.code === "EMAIL_TAKEN" || result.code === "USERNAME_TAKEN" ? 409 : result.code.startsWith("EMAIL_") ? 503 : 400;
      const id = requestId(request);
      if (status >= 500) log("warn", "auth.registration_rejected", { category: result.code, requestId: id });
      return Response.json({ error: { code: result.code, requestId: id } }, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
    }
    try {
      await store.appendAudit(auditEvent({ action: "auth.user.created", entityType: "user", entityReference: result.userId, result: "success", context: { emailDelivery: "sent" } }));
    } catch { log("warn", "auth.registration_audit_failed", { category: "AUDIT_WRITE_UNAVAILABLE", requestId: requestId(request) }); }
    return Response.json({ accepted: true, delivery: "sent" }, { status: 201, headers: apiHeaders(request) });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === "Invalid input")) return apiError("VALIDATION_ERROR", 400, request);
    return registrationFailure(request, "REGISTRATION_STORAGE_UNAVAILABLE");
  }
}
