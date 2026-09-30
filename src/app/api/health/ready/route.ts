import { apiHeaders } from "@/lib/observability";
import { readiness } from "@/lib/health";
export const runtime = "nodejs";
export async function GET(request: Request) { const report = await readiness(); return Response.json(report, { status: report.status === "ok" ? 200 : 503, headers: apiHeaders(request) }); }
