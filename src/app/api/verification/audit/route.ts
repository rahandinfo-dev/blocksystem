import { authorized } from "@/lib/verification-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { verificationStore } from "@/lib/verification-store";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    if (!authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const count = Math.min(
      200,
      Math.max(
        1,
        Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50,
      ),
    );
    return Response.json(
      { events: await store.listAudit(count) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    safeServerError(error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
