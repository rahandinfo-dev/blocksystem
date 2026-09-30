import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { validToken } from "@/lib/verification";
import { lookup } from "@/lib/verification-service";
import { verificationStore } from "@/lib/verification-store";
import { apiError, apiHeaders } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!validToken(token))
      return Response.json(
        { record: null },
        { headers: apiHeaders(request) },
      );
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "public")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    return Response.json(
      { record: await lookup(store, token) },
      {
        headers: { ...apiHeaders(request), "X-Content-Type-Options": "nosniff" },
      },
    );
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
