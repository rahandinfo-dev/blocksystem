import { authenticatedUser, updateUser } from "@/lib/auth";
import { apiError, apiHeaders } from "@/lib/observability";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const store = verificationStore(); const user = await authenticatedUser(store, request); return user ? Response.json({ user }, { headers: apiHeaders(request) }) : apiError("UNAUTHORIZED", 401, request); } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); } }
export async function PATCH(request: Request) { if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request); try { const store = verificationStore(); const user = await authenticatedUser(store, request); if (!user) return apiError("UNAUTHORIZED", 401, request); const body = await limitedJson(request) as { displayName?: unknown }; if (typeof body.displayName !== "string") return apiError("VALIDATION_ERROR", 400, request); const next = await updateUser(store, user.id, { displayName: body.displayName }); return next ? Response.json({ user: next }, { headers: apiHeaders(request) }) : apiError("NOT_FOUND", 404, request); } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); } }
