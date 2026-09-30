import { auditEvent } from "@/lib/audit";
import { createUser } from "@/lib/auth";
import { createChallenge } from "@/lib/auth-challenges";
import { sendAuthEmail } from "@/lib/auth-email";
import { apiError, apiHeaders } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const store = verificationStore(); if (!(await enforceRateLimit(store, request, "signup"))) return apiError("RATE_LIMITED", 429, request, { "Retry-After": "300" });
    const body = await limitedJson(request) as Record<string, unknown>;
    if (!["displayName", "username", "email", "password", "confirmPassword"].every((key) => typeof body[key] === "string") || body.password !== body.confirmPassword) return apiError("VALIDATION_ERROR", 400, request);
    const user = await createUser(store, { displayName: body.displayName as string, username: body.username as string, email: body.email as string, password: body.password as string, role: "ENGINEER" });
    const challenge = await createChallenge(store, user.id, "verify-email");
    const sent = await sendAuthEmail({ to: user.email, subject: "Verify your BlockSystem email", path: `/verify-email?token=${encodeURIComponent(challenge.token)}`, action: "verify your email address", expires: challenge.expiresAt });
    await store.appendAudit(auditEvent({ action: "auth.user.created", entityType: "user", entityReference: user.id, result: "success", context: { emailDelivery: sent } }));
    return Response.json({ accepted: true, delivery: sent ? "sent" : "configuration_required" }, { status: 201, headers: apiHeaders(request) });
  } catch (error) { return error instanceof Error && (error.message === "User exists" || error.message === "Username exists") ? apiError("CONFLICT", 409, request) : apiError("VALIDATION_ERROR", 400, request); }
}
