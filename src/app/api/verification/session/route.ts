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
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const body = (await limitedJson(request)) as { password?: unknown };
    if (
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      !passwordMatches(body.password)
    )
      return Response.json({ error: "unauthorized" }, { status: 401 });
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
        headers: { "Set-Cookie": sessionCookie(), "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    safeServerError(error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie":
        "bs-verification-admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    },
  });
}
