import { auditEvent } from "@/lib/audit";
import { sendAuthEmail } from "@/lib/auth-email";
import { apiError, apiHeaders } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
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
    if (!(await enforceRateLimit(store, request, "signup"))) return Response.json({ error: { code: "RATE_LIMITED" } }, { status: 429, headers: { ...apiHeaders(request), "Retry-After": "300" } });
    const result = await registerAccount(store, body as RegistrationInput, ({ to, token, expiresAt }) => sendAuthEmail({ to, subject: "Verify your BlockSystem email", path: `/verify-email?token=${encodeURIComponent(token)}`, action: "verify your email address", expires: expiresAt }));
    if (!result.ok) return Response.json({ error: { code: result.code } }, { status: result.code === "EMAIL_TAKEN" || result.code === "USERNAME_TAKEN" ? 409 : result.code === "EMAIL_DELIVERY_UNAVAILABLE" ? 503 : 400, headers: apiHeaders(request) });
    await store.appendAudit(auditEvent({ action: "auth.user.created", entityType: "user", entityReference: result.userId, result: "success", context: { emailDelivery: "sent" } }));
    return Response.json({ accepted: true, delivery: "sent" }, { status: 201, headers: apiHeaders(request) });
  } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); }
}
