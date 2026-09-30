import { authorized } from "@/lib/verification-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { verificationStore } from "@/lib/verification-store";
import { apiError, apiHeaders } from "@/lib/observability";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    if (!authorized(request))
      return apiError("UNAUTHORIZED", 401, request);
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const count = Math.min(
      200,
      Math.max(
        1,
        Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50,
      ),
    );
    return Response.json(
      { events: await store.listAudit(count) },
      { headers: apiHeaders(request) },
    );
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
