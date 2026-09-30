import { authenticatedUser } from "@/lib/auth";
import { notifications } from "@/lib/collaboration";
import { apiError, apiHeaders } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const store = verificationStore(); const user = await authenticatedUser(store, request); if (!user) return apiError("UNAUTHORIZED", 401, request); if (!(await enforceRateLimit(store, request, "collaboration"))) return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" }); return Response.json({ notifications: await notifications(store, user.id) }, { headers: apiHeaders(request) }); } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); } }
