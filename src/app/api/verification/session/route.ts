import {
  authorized,
  limitedJson,
  passwordMatches,
  sameOrigin,
  sessionCookie,
} from "@/lib/verification-auth";
import { auditEvent, requestFingerprint } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { verificationStore } from "@/lib/verification-store";
import { apiError, apiHeaders } from "@/lib/observability";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let authenticated = false;
  try {
    authenticated = authorized(request);
  } catch {
    /* Unconfigured service remains signed out. */
  }
  return Response.json(
    { authenticated },
    { headers: apiHeaders(request) },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return apiError("FORBIDDEN", 403, request);
  try {
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const body = (await limitedJson(request)) as { password?: unknown };
    if (
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      !passwordMatches(body.password)
    )
      return apiError("UNAUTHORIZED", 401, request);
    await store.appendAudit(
      auditEvent({
        action: "admin.signed-in",
        entityType: "admin",
        result: "success",
        context: { request: requestFingerprint(request) },
      }),
    );
    return Response.json(
      { ok: true },
      {
        headers: apiHeaders(request, { "Set-Cookie": sessionCookie() }),
      },
    );
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  return new Response(null, {
    status: 204,
    headers: {
      ...apiHeaders(request),
      "Set-Cookie":
        "bs-verification-admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    },
  });
}
