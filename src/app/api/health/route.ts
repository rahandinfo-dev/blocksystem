import { apiHeaders } from "@/lib/observability";
import { liveness, readiness } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "live") return Response.json(liveness(), { headers: apiHeaders(request) });
  const report = await readiness();
  return Response.json(report, { headers: apiHeaders(request) });
}
