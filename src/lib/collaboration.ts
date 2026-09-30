import { randomUUID } from "node:crypto";
import { auditEvent } from "./audit.ts";
import { getUser, grantProjectAccess, revokeProjectAccess } from "./auth.ts";
import type { SafeUser } from "./auth-types.ts";
import type { VerificationStore } from "./verification-store.ts";

export const projectRoles = ["OWNER", "EDITOR", "COMMENTER", "VIEWER"] as const;
export type ProjectRole = (typeof projectRoles)[number];
export type ProjectMember = { id: string; projectId: string; userId: string; role: ProjectRole; status: "ACTIVE" | "REMOVED"; createdAt: string; createdBy: string };
export type ProjectComment = { id: string; projectId: string; authorId: string; content: string; createdAt: string; updatedAt?: string; parentCommentId?: string; deletedAt?: string };
export type ProjectAssignment = { id: string; projectId: string; assigneeId: string; assignedBy: string; createdAt: string; status: "ACTIVE" | "REMOVED" };
export type CollaborationActivity = { id: string; projectId: string; actorId: string; action: string; createdAt: string; targetId?: string; detail?: string };
export type CollaborationNotification = { id: string; userId: string; projectId: string; kind: "member" | "mention" | "reply" | "assignment" | "role" | "owner"; createdAt: string; readAt?: string };
type ProjectMeta = { projectId: string; ownerId: string; revision: number; createdAt: string; updatedAt: string };
export type CollaborationSnapshot = { projectId: string; ownerId: string; revision: number; members: ProjectMember[]; comments: ProjectComment[]; assignments: ProjectAssignment[]; activity: CollaborationActivity[] };
export class CollaborationConflict extends Error {}
export class CollaborationForbidden extends Error {}

const metaKey = (projectId: string) => `bs:collab:project:${projectId}`;
const ownerKey = (projectId: string) => `bs:collab:owner:${projectId}`;
const memberKey = (projectId: string, userId: string) => `bs:collab:member:${projectId}:${userId}`;
const memberIndex = (projectId: string) => `bs:collab:members:${projectId}`;
const commentKey = (id: string) => `bs:collab:comment:${id}`;
const commentIndex = (projectId: string) => `bs:collab:comments:${projectId}`;
const assignmentKey = (projectId: string, userId: string) => `bs:collab:assignment:${projectId}:${userId}`;
const assignmentIndex = (projectId: string) => `bs:collab:assignments:${projectId}`;
const activityKey = (projectId: string) => `bs:collab:activity:${projectId}`;
const notificationKey = (userId: string) => `bs:collab:notifications:${userId}`;
const validProjectId = (value: string) => /^[A-Za-z0-9_-]{1,100}$/.test(value);
const validUserId = (value: string) => /^[a-f0-9-]{36}$/i.test(value);
function parsed<T>(value: string | null): T | null { try { return value ? JSON.parse(value) as T : null; } catch { return null; } }
async function records<T>(store: VerificationStore, key: string): Promise<T[]> { return (await Promise.all((await store.authMembers(key)).map((id) => store.authGet(id)))).map((raw) => parsed<T>(raw)).filter((value): value is T => Boolean(value)); }
async function meta(store: VerificationStore, projectId: string) { return parsed<ProjectMeta>(await store.authGet(metaKey(projectId))); }
function active(member: ProjectMember | null) { return Boolean(member && member.status === "ACTIVE"); }
export function allows(role: ProjectRole, action: "read" | "edit" | "comment" | "manage") {
  return role === "OWNER" || (role === "EDITOR" && action !== "manage") || (role === "COMMENTER" && ["read", "comment"].includes(action)) || (role === "VIEWER" && action === "read");
}
export async function membership(store: VerificationStore, projectId: string, userId: string) { return parsed<ProjectMember>(await store.authGet(memberKey(projectId, userId))); }
export async function projectAccess(store: VerificationStore, user: SafeUser, projectId: string, action: "read" | "edit" | "comment" | "manage") {
  if (!validProjectId(projectId)) return null;
  if (["SUPER_ADMIN", "ADMIN"].includes(user.role)) return { role: "OWNER" as ProjectRole, system: true };
  const member = await membership(store, projectId, user.id);
  return member && active(member) && allows(member.role, action) ? { role: member.role, system: false } : null;
}
async function event(store: VerificationStore, projectId: string, actorId: string, action: string, targetId?: string, detail?: string) {
  const entry: CollaborationActivity = { id: randomUUID(), projectId, actorId, action, createdAt: new Date().toISOString(), ...(targetId ? { targetId } : {}), ...(detail ? { detail } : {}) };
  await store.authSet(`bs:collab:activity-record:${entry.id}`, JSON.stringify(entry)); await store.authAddMember(activityKey(projectId), `bs:collab:activity-record:${entry.id}`);
}
async function notify(store: VerificationStore, userId: string, projectId: string, kind: CollaborationNotification["kind"]) {
  const notification: CollaborationNotification = { id: randomUUID(), userId, projectId, kind, createdAt: new Date().toISOString() };
  await store.authSet(`bs:collab:notification-record:${notification.id}`, JSON.stringify(notification)); await store.authAddMember(notificationKey(userId), `bs:collab:notification-record:${notification.id}`);
}
async function revise(store: VerificationStore, current: ProjectMeta, expectedVersion: number) {
  if (!Number.isSafeInteger(expectedVersion) || current.revision !== expectedVersion) throw new CollaborationConflict("Project changed");
  const next = { ...current, revision: current.revision + 1, updatedAt: new Date().toISOString() };
  const key = metaKey(current.projectId); const raw = await store.authGet(key);
  const live = parsed<ProjectMeta>(raw);
  if (!raw || !live || live.revision !== expectedVersion || !(await store.authCompareAndSet(key, raw, JSON.stringify(next)))) throw new CollaborationConflict("Project changed");
  return next;
}
export async function initializeCollaboration(store: VerificationStore, projectId: string, owner: SafeUser) {
  if (!validProjectId(projectId) || !validUserId(owner.id)) throw new Error("Invalid project");
  const existing = await meta(store, projectId); if (existing) return existing;
  if (!(await store.authSetIfAbsent(ownerKey(projectId), owner.id))) return meta(store, projectId);
  const now = new Date().toISOString(); const project: ProjectMeta = { projectId, ownerId: owner.id, revision: 1, createdAt: now, updatedAt: now };
  const member: ProjectMember = { id: randomUUID(), projectId, userId: owner.id, role: "OWNER", status: "ACTIVE", createdAt: now, createdBy: owner.id };
  await store.authSet(metaKey(projectId), JSON.stringify(project)); await store.authSet(memberKey(projectId, owner.id), JSON.stringify(member)); await store.authAddMember(memberIndex(projectId), memberKey(projectId, owner.id)); await grantProjectAccess(store, projectId, owner.id);
  await event(store, projectId, owner.id, "project.collaboration.enabled"); await store.appendAudit(auditEvent({ action: "project.member.added", entityType: "project", entityReference: projectId, result: "success", context: { role: "OWNER" } }));
  return project;
}
export async function snapshot(store: VerificationStore, projectId: string): Promise<CollaborationSnapshot | null> {
  const project = await meta(store, projectId); if (!project) return null;
  const [members, comments, assignments, activity] = await Promise.all([records<ProjectMember>(store, memberIndex(projectId)), records<ProjectComment>(store, commentIndex(projectId)), records<ProjectAssignment>(store, assignmentIndex(projectId)), records<CollaborationActivity>(store, activityKey(projectId))]);
  return { projectId, ownerId: project.ownerId, revision: project.revision, members: members.filter((item) => item.status === "ACTIVE"), comments: comments.filter((item) => !item.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-100), assignments: assignments.filter((item) => item.status === "ACTIVE"), activity: activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100) };
}
export async function addMember(store: VerificationStore, projectId: string, actor: SafeUser, targetId: string, role: ProjectRole, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project) throw new Error("Not found"); if (!(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden();
  if (!validUserId(targetId) || !projectRoles.includes(role) || role === "OWNER") throw new Error("Invalid member");
  const target = await getUser(store, targetId); if (!target || target.status !== "ACTIVE") throw new Error("Invalid member");
  await revise(store, project, expectedVersion); const now = new Date().toISOString(); const member: ProjectMember = { id: randomUUID(), projectId, userId: targetId, role, status: "ACTIVE", createdAt: now, createdBy: actor.id };
  await store.authSet(memberKey(projectId, targetId), JSON.stringify(member)); await store.authAddMember(memberIndex(projectId), memberKey(projectId, targetId)); await grantProjectAccess(store, projectId, targetId); await event(store, projectId, actor.id, "project.member.added", targetId, role); await notify(store, targetId, projectId, "member"); await store.appendAudit(auditEvent({ action: "project.member.added", entityType: "project", entityReference: projectId, result: "success", context: { role } })); return member;
}
export async function changeMember(store: VerificationStore, projectId: string, actor: SafeUser, targetId: string, role: ProjectRole, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project) throw new Error("Not found"); if (!(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden();
  const member = await membership(store, projectId, targetId); if (!active(member) || member?.role === "OWNER" || !projectRoles.includes(role) || role === "OWNER") throw new Error("Invalid member");
  await revise(store, project, expectedVersion); const next = { ...member, role }; await store.authSet(memberKey(projectId, targetId), JSON.stringify(next)); await event(store, projectId, actor.id, "project.member.role.changed", targetId, role); await notify(store, targetId, projectId, "role"); await store.appendAudit(auditEvent({ action: "project.member.role.changed", entityType: "project", entityReference: projectId, result: "success", context: { role } })); return next;
}
export async function removeMember(store: VerificationStore, projectId: string, actor: SafeUser, targetId: string, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project) throw new Error("Not found"); if (!(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden();
  const member = await membership(store, projectId, targetId); if (!active(member) || member?.role === "OWNER") throw new Error("Invalid member");
  await revise(store, project, expectedVersion); await store.authSet(memberKey(projectId, targetId), JSON.stringify({ ...member, status: "REMOVED" })); await revokeProjectAccess(store, projectId, targetId); await event(store, projectId, actor.id, "project.member.removed", targetId); await store.appendAudit(auditEvent({ action: "project.member.removed", entityType: "project", entityReference: projectId, result: "success" }));
}
export async function transferOwner(store: VerificationStore, projectId: string, actor: SafeUser, targetId: string, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project || project.ownerId !== actor.id) throw new CollaborationForbidden(); const target = await membership(store, projectId, targetId); if (!active(target) || targetId === actor.id) throw new Error("Invalid member");
  const next = await revise(store, project, expectedVersion); await store.authSet(metaKey(projectId), JSON.stringify({ ...next, ownerId: targetId })); const owner = await membership(store, projectId, actor.id); if (owner) await store.authSet(memberKey(projectId, actor.id), JSON.stringify({ ...owner, role: "EDITOR" })); await store.authSet(memberKey(projectId, targetId), JSON.stringify({ ...target, role: "OWNER" })); await event(store, projectId, actor.id, "project.owner.transferred", targetId); await notify(store, targetId, projectId, "owner"); await store.appendAudit(auditEvent({ action: "project.owner.transferred", entityType: "project", entityReference: projectId, result: "success" }));
}
function commentText(value: unknown) { if (typeof value !== "string") throw new Error("Invalid comment"); const text = value.trim().replace(/\s+/g, " "); if (!text || text.length > 4000) throw new Error("Invalid comment"); return text; }
export async function addComment(store: VerificationStore, projectId: string, actor: SafeUser, content: unknown, parentCommentId: unknown, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project) throw new Error("Not found"); if (!(await projectAccess(store, actor, projectId, "comment"))) throw new CollaborationForbidden(); const text = commentText(content); let parent: ProjectComment | null = null;
  if (parentCommentId !== undefined) { if (typeof parentCommentId !== "string") throw new Error("Invalid comment"); parent = parsed<ProjectComment>(await store.authGet(commentKey(parentCommentId))); if (!parent || parent.projectId !== projectId || parent.parentCommentId || parent.deletedAt) throw new Error("Invalid comment"); }
  await revise(store, project, expectedVersion); const comment: ProjectComment = { id: randomUUID(), projectId, authorId: actor.id, content: text, createdAt: new Date().toISOString(), ...(parent ? { parentCommentId: parent.id } : {}) }; await store.authSet(commentKey(comment.id), JSON.stringify(comment)); await store.authAddMember(commentIndex(projectId), commentKey(comment.id)); await event(store, projectId, actor.id, parent ? "project.comment.replied" : "project.comment.created", comment.id);
  const members = await records<ProjectMember>(store, memberIndex(projectId)); for (const member of members.filter((item) => item.status === "ACTIVE" && item.userId !== actor.id)) if (text.toLowerCase().includes(`@${(await getUser(store, member.userId))?.email.toLowerCase() ?? ""}`) || (parent && member.userId === parent.authorId)) await notify(store, member.userId, projectId, parent && member.userId === parent.authorId ? "reply" : "mention");
  await store.appendAudit(auditEvent({ action: "project.comment.created", entityType: "project", entityReference: projectId, result: "success" })); return comment;
}
export async function editComment(store: VerificationStore, projectId: string, actor: SafeUser, commentId: string, content: unknown, expectedVersion: number) {
  const project = await meta(store, projectId); const comment = parsed<ProjectComment>(await store.authGet(commentKey(commentId))); if (!project || !comment || comment.projectId !== projectId || comment.deletedAt) throw new Error("Not found");
  if (comment.authorId !== actor.id && !(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden(); await revise(store, project, expectedVersion); await store.authSet(commentKey(commentId), JSON.stringify({ ...comment, content: commentText(content), updatedAt: new Date().toISOString() })); await event(store, projectId, actor.id, "project.comment.updated", commentId);
}
export async function deleteComment(store: VerificationStore, projectId: string, actor: SafeUser, commentId: string, expectedVersion: number) {
  const project = await meta(store, projectId); const comment = parsed<ProjectComment>(await store.authGet(commentKey(commentId))); if (!project || !comment || comment.projectId !== projectId || comment.deletedAt) throw new Error("Not found");
  if (comment.authorId !== actor.id && !(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden(); await revise(store, project, expectedVersion); await store.authSet(commentKey(commentId), JSON.stringify({ ...comment, deletedAt: new Date().toISOString() })); await event(store, projectId, actor.id, "project.comment.deleted", commentId); await store.appendAudit(auditEvent({ action: "project.comment.created", entityType: "project", entityReference: projectId, result: "success", context: { deletion: true } }));
}
export async function setAssignment(store: VerificationStore, projectId: string, actor: SafeUser, assigneeId: string, expectedVersion: number) {
  const project = await meta(store, projectId); if (!project) throw new Error("Not found"); if (!(await projectAccess(store, actor, projectId, "manage"))) throw new CollaborationForbidden(); const member = await membership(store, projectId, assigneeId); if (!active(member)) throw new Error("Invalid member"); await revise(store, project, expectedVersion); const assignment: ProjectAssignment = { id: randomUUID(), projectId, assigneeId, assignedBy: actor.id, createdAt: new Date().toISOString(), status: "ACTIVE" }; await store.authSet(assignmentKey(projectId, assigneeId), JSON.stringify(assignment)); await store.authAddMember(assignmentIndex(projectId), assignmentKey(projectId, assigneeId)); await event(store, projectId, actor.id, "project.assignment.changed", assigneeId); await notify(store, assigneeId, projectId, "assignment"); await store.appendAudit(auditEvent({ action: "project.assignment.changed", entityType: "project", entityReference: projectId, result: "success" })); return assignment;
}
export async function notifications(store: VerificationStore, userId: string) { return (await records<CollaborationNotification>(store, notificationKey(userId))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50); }
