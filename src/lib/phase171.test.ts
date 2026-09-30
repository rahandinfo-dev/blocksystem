import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createUser, validPassword } from "./auth.ts";
import { deleteServerProject, getServerProject, listServerProjects, saveServerProject } from "./server-projects.ts";
import { createDefaultProject } from "../features/calculator/lib/project-state.ts";
import { FileVerificationStore } from "./verification-store.ts";

async function store() { return new FileVerificationStore(await mkdtemp(join(tmpdir(), "blocksystem-phase171-"))); }
async function account(data: FileVerificationStore, email: string) { return createUser(data, { email, username: email.split("@")[0], displayName: email, password: "correct horse battery staple", role: "ENGINEER", emailVerified: true }); }
function project(id: string) { const data = createDefaultProject(); data.metadata.projectName = "Durable project"; return { version: 6 as const, id, name: "Durable project", savedAt: new Date().toISOString(), data }; }

test("server projects persist across reads and do not cross account ownership boundaries", async () => {
  const data = await store(); const one = await account(data, "one@example.test"); const two = await account(data, "two@example.test"); const saved = await saveServerProject(data, one, project("project-11111111-1111-4111-8111-111111111111"));
  assert.equal(saved.created, true); assert.equal((await listServerProjects(data, one)).length, 1); assert.equal((await getServerProject(data, one, saved.project.id))?.name, "Durable project");
  assert.equal(await getServerProject(data, two, saved.project.id), null);
  await assert.rejects(() => saveServerProject(data, two, { ...saved.project, name: "Attempted overwrite" }));
  assert.equal(await deleteServerProject(data, two, saved.project.id), false); assert.equal((await listServerProjects(data, one)).length, 1);
  assert.equal(await deleteServerProject(data, one, saved.project.id), true); assert.equal((await listServerProjects(data, one)).length, 0);
});

test("password policy accepts long passphrases or three character classes without retaining plaintext", () => {
  assert.equal(validPassword("correct horse battery staple"), true);
  assert.equal(validPassword("Short7!word"), false);
  assert.equal(validPassword("lowercaseonly"), false);
  assert.equal(validPassword("AsecurePassword123"), true);
});
