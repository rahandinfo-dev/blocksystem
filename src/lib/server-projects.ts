import { randomUUID } from "node:crypto";
import type { SavedProject } from "../features/calculator/types/index.ts";
import { migrateSavedProject } from "./project-schema.ts";
import type { SafeUser } from "./auth-types.ts";
import type { VerificationStore } from "./verification-store.ts";

type StoredProject = { id: string; ownerId: string; createdAt: string; updatedAt: string; project: SavedProject };
const key = (id: string) => `bs:project:${id}`;
const index = (userId: string) => `bs:projects:user:${userId}`;
const validId = (value: string) => /^project-[A-Za-z0-9-]{8,100}$/.test(value);
const parsed = (raw: string | null): StoredProject | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as StoredProject;
    if (!value || !validId(value.id) || !/^[a-f0-9-]{36}$/i.test(value.ownerId) || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null;
    const project = migrateSavedProject(value.project);
    return project ? { ...value, project } : null;
  } catch { return null; }
};
function prepare(input: unknown, fallbackId?: string): SavedProject {
  if (!input || typeof input !== "object") throw new Error("Invalid project");
  const project = migrateSavedProject(input);
  if (!project || !validId(project.id) || JSON.stringify(project).length > 900_000) throw new Error("Invalid project");
  return fallbackId && project.id !== fallbackId ? { ...project, id: fallbackId } : project;
}
export async function listServerProjects(store: VerificationStore, user: SafeUser) {
  const records = await Promise.all((await store.authMembers(index(user.id))).map(async (id) => parsed(await store.authGet(key(id)))));
  return records.filter((record): record is StoredProject => Boolean(record && record.ownerId === user.id)).map((record) => record.project).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
export async function getServerProject(store: VerificationStore, user: SafeUser, id: string) {
  if (!validId(id)) return null;
  const record = parsed(await store.authGet(key(id)));
  return record?.ownerId === user.id ? record.project : null;
}
export async function saveServerProject(store: VerificationStore, user: SafeUser, input: unknown) {
  const project = prepare(input); const current = parsed(await store.authGet(key(project.id))); const now = new Date().toISOString();
  if (current && current.ownerId !== user.id) throw new Error("Forbidden");
  const record: StoredProject = { id: project.id, ownerId: user.id, createdAt: current?.createdAt ?? project.createdAt ?? now, updatedAt: now, project: { ...project, createdAt: current?.project.createdAt ?? project.createdAt ?? now, savedAt: now } };
  await store.authSet(key(record.id), JSON.stringify(record)); await store.authAddMember(index(user.id), record.id);
  return { project: record.project, created: !current };
}
export async function deleteServerProject(store: VerificationStore, user: SafeUser, id: string) {
  if (!validId(id)) return false;
  const current = parsed(await store.authGet(key(id))); if (!current || current.ownerId !== user.id) return false;
  await store.authDelete(key(id)); await store.authRemoveMember(index(user.id), id); return true;
}
export function newServerProjectId() { return `project-${randomUUID()}`; }
