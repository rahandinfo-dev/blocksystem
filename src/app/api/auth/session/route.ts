import { auditEvent, requestFingerprint } from "@/lib/audit";
import { authenticatedUser, authEnvironment, clearSessionCookie, createSession, ensureBootstrapSuperAdmin, getUserByIdentifier, passwordMatches, revokeSession } from "@/lib/auth";
import { apiError, apiHeaders } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const store = verificationStore(); return Response.json({ user: await authenticatedUser(store, request) }, { headers: apiHeaders(request) }); }
  catch { return Response.json({ user: null }, { headers: apiHeaders(request) }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "login"))) return apiError("RATE_LIMITED", 429, request, { "Retry-After": "300" });
    await ensureBootstrapSuperAdmin(store, authEnvironment());
    const body = await limitedJson(request) as { email?: unknown; password?: unknown; identifier?: unknown };
    const email = typeof (body.identifier ?? body.email) === "string" ? String(body.identifier ?? body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await getUserByIdentifier(store, email);
    const valid = Boolean(user && user.status === "ACTIVE" && password && await passwordMatches(password, user.passwordHash));
    await store.appendAudit(auditEvent({ action: valid ? "auth.login.success" : "auth.login.failure", entityType: "auth", entityReference: user?.id, result: valid ? "success" : "failure", context: { request: requestFingerprint(request) } }));
    if (!valid || !user) return apiError("UNAUTHORIZED", 401, request);
    if (user.emailVerificationRequired && !user.emailVerifiedAt) return apiError("FORBIDDEN", 403, request);
    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt } }, { headers: apiHeaders(request, { "Set-Cookie": await createSession(store, user) }) });
  } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try { const store = verificationStore(); const user = await authenticatedUser(store, request); await revokeSession(store, request); if (user) await store.appendAudit(auditEvent({ action: "auth.logout", entityType: "auth", entityReference: user.id, result: "success" })); return new Response(null, { status: 204, headers: apiHeaders(request, { "Set-Cookie": clearSessionCookie() }) }); }
  catch { return new Response(null, { status: 204, headers: apiHeaders(request, { "Set-Cookie": clearSessionCookie() }) }); }
}
