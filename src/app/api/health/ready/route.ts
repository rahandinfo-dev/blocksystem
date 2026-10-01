import { apiHeaders } from "@/lib/observability";
import { readiness } from "@/lib/health";
export const runtime = "nodejs";
export async function GET(request: Request) { const report = await readiness(); return Response.json(report, { headers: apiHeaders(request) }); }
