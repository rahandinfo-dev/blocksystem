import { auditEvent } from "@/lib/audit";
import { getUserByEmail } from "@/lib/auth";
import { createChallenge, discardChallenge } from "@/lib/auth-challenges";
import { sendAuthEmail } from "@/lib/auth-email";
import { apiHeaders, apiError } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function POST(request: Request) { if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request); try { const store = verificationStore(); if (!(await enforceRateLimit(store, request, "password-reset"))) return apiError("RATE_LIMITED", 429, request); const body = await limitedJson(request) as { email?: unknown }; const user = typeof body.email === "string" ? await getUserByEmail(store, body.email) : null; if (user?.emailVerifiedAt) { const challenge = await createChallenge(store, user.id, "reset-password"); const delivery = await sendAuthEmail({ to: user.email, subject: "Reset your RekApps password", path: `/reset-password?token=${encodeURIComponent(challenge.token)}`, action: "reset your password", expires: challenge.expiresAt }); if (delivery !== "sent") await discardChallenge(store, challenge.token, "reset-password"); await store.appendAudit(auditEvent({ action: "auth.login.failure", entityType: "auth", entityReference: user.id, result: delivery === "sent" ? "success" : "failure", context: { event: "password_reset_requested", emailDelivery: delivery === "sent" ? "provider_accepted" : "not_accepted" } })); } return Response.json({ accepted: true }, { headers: apiHeaders(request) }); } catch { return Response.json({ accepted: true }, { headers: apiHeaders(request) }); } }
