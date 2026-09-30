import { authenticatedUser } from "@/lib/auth";
import { apiError, apiHeaders } from "@/lib/observability";
import { verificationStore } from "@/lib/verification-store";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { const store = verificationStore(); const user = await authenticatedUser(store, request); if (!user) return apiError("UNAUTHORIZED", 401, request); const events = (await store.listAudit(200)).filter((event) => event.entityReference === user.id || event.context?.actorId === user.id).map(({ id, action, timestamp, entityType, entityReference, result, context }) => ({ id, action, timestamp, entityType, entityReference, result, kind: context?.event === "email_verified" || context?.event === "password_changed" ? context.event : undefined })); return Response.json({ events }, { headers: apiHeaders(request) }); } catch { return apiError("DEPENDENCY_UNAVAILABLE", 503, request); } }
