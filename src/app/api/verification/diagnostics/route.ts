import { verificationStore } from "@/lib/verification-store";
import { apiError, apiHeaders } from "@/lib/observability";
import { readiness } from "@/lib/health";
import { permits } from "@/lib/request-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!(await permits(verificationStore(), request, "system.health.read"))) return apiError("FORBIDDEN", 403, request);
    return Response.json(await readiness(), { headers: apiHeaders(request) });
  } catch {
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
