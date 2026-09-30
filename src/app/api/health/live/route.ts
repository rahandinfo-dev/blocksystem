import { apiHeaders } from "@/lib/observability";
import { liveness } from "@/lib/health";
export const runtime = "nodejs";
export function GET(request: Request) { return Response.json(liveness(), { headers: apiHeaders(request) }); }
