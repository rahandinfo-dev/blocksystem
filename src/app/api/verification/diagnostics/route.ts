import { verificationStore } from "@/lib/verification-store";
import { apiError, apiHeaders } from "@/lib/observability";
import { readiness } from "@/lib/health";
import { authorized } from "@/lib/verification-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!authorized(request)) return apiError("FORBIDDEN", 403, request);
    return Response.json(await readiness(), { headers: apiHeaders(request) });
  } catch {
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
