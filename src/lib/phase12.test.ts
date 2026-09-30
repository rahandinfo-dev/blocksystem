import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { addComment, addMember, changeMember, CollaborationConflict, initializeCollaboration, projectAccess, removeMember, snapshot } from "./collaboration.ts";
import { canAccessProject, createUser } from "./auth.ts";
import { phase12Messages } from "./phase12-messages.ts";
import { FileVerificationStore } from "./verification-store.ts";

async function fixture() {
  const store = new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-collaboration-")));
  const owner = await createUser(store, { email: "owner@example.test", displayName: "Owner", password: "correct horse battery staple", role: "ENGINEER" });
  const editor = await createUser(store, { email: "editor@example.test", displayName: "Editor", password: "correct horse battery staple", role: "ENGINEER" });
  const viewer = await createUser(store, { email: "viewer@example.test", displayName: "Viewer", password: "correct horse battery staple", role: "VIEWER" });
  await initializeCollaboration(store, "project-collab-test", owner);
  return { store, owner, editor, viewer, projectId: "project-collab-test" };
}
test("collaboration ownership is explicit and project roles are server-enforced", async () => {
  const { store, owner, editor, viewer, projectId } = await fixture();
  let data = await snapshot(store, projectId); assert.equal(data?.members[0]?.role, "OWNER");
  await addMember(store, projectId, owner, editor.id, "EDITOR", data!.revision); data = await snapshot(store, projectId);
  await addMember(store, projectId, owner, viewer.id, "VIEWER", data!.revision);
  assert.ok(await projectAccess(store, editor, projectId, "edit"));
  assert.equal(await projectAccess(store, viewer, projectId, "comment"), null);
  assert.equal(await projectAccess(store, viewer, "other-project", "read"), null);
});
test("membership removal revokes project access and stale writes are conflicts", async () => {
  const { store, owner, editor, projectId } = await fixture();
  const initial = await snapshot(store, projectId); await addMember(store, projectId, owner, editor.id, "COMMENTER", initial!.revision);
  const current = await snapshot(store, projectId); assert.equal(await canAccessProject(store, editor, projectId), true);
  await assert.rejects(() => addComment(store, projectId, editor, "hello", undefined, current!.revision - 1), CollaborationConflict);
  await addComment(store, projectId, editor, "hello @owner@example.test", undefined, current!.revision);
  const afterComment = await snapshot(store, projectId); const root = afterComment!.comments[0];
  await addComment(store, projectId, owner, "reply", root.id, afterComment!.revision);
  const afterReply = await snapshot(store, projectId); assert.equal(afterReply!.comments.length, 2);
  await removeMember(store, projectId, owner, editor.id, afterReply!.revision);
  assert.equal(await canAccessProject(store, editor, projectId), false);
  await assert.rejects(() => addComment(store, projectId, editor, "no", undefined, afterReply!.revision + 1));
});
test("project member role changes cannot create owner escalation", async () => {
  const { store, owner, editor, projectId } = await fixture();
  const first = await snapshot(store, projectId); await addMember(store, projectId, owner, editor.id, "EDITOR", first!.revision); const current = await snapshot(store, projectId);
  await assert.rejects(() => changeMember(store, projectId, owner, editor.id, "OWNER", current!.revision));
  assert.equal((await snapshot(store, projectId))?.ownerId, owner.id);
});
test("Phase 12 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase12Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) assert.deepEqual(Object.keys(phase12Messages[language]).sort(), [...keys].sort());
});
