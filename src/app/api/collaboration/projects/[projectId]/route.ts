import { authenticatedUser, getUser, hasPermission, listUsers } from "@/lib/auth";
import { addComment, addMember, changeMember, CollaborationConflict, CollaborationForbidden, deleteComment, editComment, initializeCollaboration, projectAccess, projectRoles, removeMember, setAssignment, snapshot, transferOwner } from "@/lib/collaboration";
import { apiError, apiHeaders } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/rate-limit";
import { limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const projectIdFrom = async (context: { params: Promise<{ projectId: string }> }) => (await context.params).projectId;
async function actor(request: Request) { const store = verificationStore(); return { store, user: await authenticatedUser(store, request) }; }
function failure(error: unknown, request: Request) { if (error instanceof CollaborationConflict) return apiError("CONFLICT", 409, request); if (error instanceof CollaborationForbidden) return apiError("NOT_FOUND", 404, request); if (error instanceof Error && /Invalid|Not found/.test(error.message)) return apiError("VALIDATION_ERROR", 400, request); return apiError("DEPENDENCY_UNAVAILABLE", 503, request); }
async function visibleSnapshot(store: ReturnType<typeof verificationStore>, projectId: string, user: NonNullable<Awaited<ReturnType<typeof authenticatedUser>>>) {
  if (!(await projectAccess(store, user, projectId, "read"))) return null;
  const data = await snapshot(store, projectId); if (!data) return null;
  const ids = [...new Set([...data.members.map((item) => item.userId), ...data.comments.map((item) => item.authorId), ...data.assignments.map((item) => item.assigneeId), ...data.activity.map((item) => item.actorId)])];
  const entries = await Promise.all(ids.map(async (id) => {
    const person = await getUser(store, id);
    return [id, person ? { id: person.id, displayName: person.displayName, email: person.email, status: person.status } : { id, displayName: "—", status: "DISABLED" }] as const;
  }));
  const people = Object.fromEntries(entries);
  return { ...data, people };
}
export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { store, user } = await actor(request); if (!user) return apiError("UNAUTHORIZED", 401, request); const projectId = await projectIdFrom(context);
    if (!hasPermission(user.role, "projects.read")) return apiError("FORBIDDEN", 403, request);
    if (!(await enforceRateLimit(store, request, new URL(request.url).searchParams.has("search") ? "memberSearch" : "collaboration"))) return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const search = new URL(request.url).searchParams.get("search");
    if (search !== null) {
      if (!(await projectAccess(store, user, projectId, "manage"))) return apiError("NOT_FOUND", 404, request);
      const needle = search.trim().toLowerCase().slice(0, 120); if (needle.length < 2) return Response.json({ users: [] }, { headers: apiHeaders(request) });
      const members = (await snapshot(store, projectId))?.members.map((item) => item.userId) ?? [];
      const users = (await listUsers(store)).filter((item) => item.status === "ACTIVE" && !members.includes(item.id) && (item.email.toLowerCase().includes(needle) || item.displayName.toLowerCase().includes(needle))).slice(0, 10).map(({ id, email, displayName }) => ({ id, email, displayName }));
      return Response.json({ users }, { headers: apiHeaders(request) });
    }
    const data = await visibleSnapshot(store, projectId, user); return data ? Response.json(data, { headers: apiHeaders(request) }) : Response.json({ initialized: false }, { headers: apiHeaders(request) });
  } catch (error) { return failure(error, request); }
}
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!sameOrigin(request)) return apiError("FORBIDDEN", 403, request);
  try {
    const { store, user } = await actor(request); if (!user) return apiError("UNAUTHORIZED", 401, request); const projectId = await projectIdFrom(context); const body = await limitedJson(request) as { action?: unknown; expectedVersion?: unknown; userId?: unknown; role?: unknown; content?: unknown; parentCommentId?: unknown; commentId?: unknown };
    const action = body.action; if (typeof action !== "string") return apiError("VALIDATION_ERROR", 400, request);
    if (!(await enforceRateLimit(store, request, action === "comment" ? "comment" : "collaboration"))) return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    if (action === "initialize") { if (!hasPermission(user.role, "projects.update")) return apiError("FORBIDDEN", 403, request); const data = await initializeCollaboration(store, projectId, user); return Response.json({ initialized: true, revision: data?.revision }, { status: 201, headers: apiHeaders(request) }); }
    const expected = typeof body.expectedVersion === "number" ? body.expectedVersion : Number.NaN;
    if (action === "member.add" && typeof body.userId === "string" && typeof body.role === "string" && projectRoles.includes(body.role as never)) await addMember(store, projectId, user, body.userId, body.role as never, expected);
    else if (action === "member.change" && typeof body.userId === "string" && typeof body.role === "string" && projectRoles.includes(body.role as never)) await changeMember(store, projectId, user, body.userId, body.role as never, expected);
    else if (action === "member.remove" && typeof body.userId === "string") await removeMember(store, projectId, user, body.userId, expected);
    else if (action === "owner.transfer" && typeof body.userId === "string") await transferOwner(store, projectId, user, body.userId, expected);
    else if (action === "comment") await addComment(store, projectId, user, body.content, body.parentCommentId, expected);
    else if (action === "comment.edit" && typeof body.commentId === "string") await editComment(store, projectId, user, body.commentId, body.content, expected);
    else if (action === "comment.delete" && typeof body.commentId === "string") await deleteComment(store, projectId, user, body.commentId, expected);
    else if (action === "assignment" && typeof body.userId === "string") await setAssignment(store, projectId, user, body.userId, expected);
    else return apiError("VALIDATION_ERROR", 400, request);
    const data = await visibleSnapshot(store, projectId, user); return data ? Response.json(data, { headers: apiHeaders(request) }) : apiError("NOT_FOUND", 404, request);
  } catch (error) { return failure(error, request); }
}

