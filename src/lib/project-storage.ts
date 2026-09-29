import type { CalculatorProjectData, ProjectVersion, SavedProject, SaveKind, WorkspaceActivity, WorkspaceNotification, WorkspacePreferences } from "@/features/calculator/types";
import { calculationEngineVersion, migrateSavedProject, projectSchemaVersion } from "@/lib/project-schema";

const storageKey = "yek-block-projects-v1";
const recoveryKey = "yek-block-recovery-v1";
const versionsKey = "blocksystem:project-versions:v1";
const favoritesKey = "blocksystem:favorites:v1";
const notificationsKey = "blocksystem:notifications:v1";
const activityKey = "blocksystem:activity:v1";
const preferencesKey = "blocksystem:preferences:v1";
const recentSearchesKey = "blocksystem:recent-searches:v1";
const activeProjectKey = "blocksystem:active-project:v1";
const storageEventName = "yek-block-projects-changed";

export type ProjectSaveResult = { ok: true; project: SavedProject; changed: boolean; version?: ProjectVersion } | { ok: false };

function canUseStorage() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function read<T>(key: string, fallback: T): T { if (!canUseStorage()) return fallback; try { const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null"); return value === null ? fallback : value as T; } catch { return fallback; } }
function write(key: string, value: unknown): boolean { if (!canUseStorage()) return false; try { window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event(storageEventName)); return true; } catch { return false; } }
function projectName(data: CalculatorProjectData) { return data.metadata.projectName.trim() || "Untitled project"; }
function makeId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

export function getSavedProjects(): SavedProject[] { return read<unknown[]>(storageKey, []).map(migrateSavedProject).filter((project): project is SavedProject => project !== null); }
function writeProjects(projects: SavedProject[]) { return write(storageKey, projects); }
export function getProjectVersions(projectId: string): ProjectVersion[] { return read<Record<string, ProjectVersion[]>>(versionsKey, {})[projectId] ?? []; }

function addVersion(projectId: string, data: CalculatorProjectData, saveKind: SaveKind): ProjectVersion | null {
  const all = read<Record<string, ProjectVersion[]>>(versionsKey, {});
  const current = all[projectId] ?? [];
  const previous = current[0];
  if (previous && JSON.stringify(previous.data) === JSON.stringify(data) && saveKind === "autosave") return null;
  const version: ProjectVersion = { id: makeId("version"), projectId, revision: (previous?.revision ?? 0) + 1, savedAt: new Date().toISOString(), saveKind, data: clone(data) };
  all[projectId] = [version, ...current].slice(0, 60);
  return write(versionsKey, all) ? version : null;
}

export function getWorkspaceActivity(): WorkspaceActivity[] { return read<WorkspaceActivity[]>(activityKey, []).filter((item) => typeof item?.id === "string" && typeof item?.createdAt === "string"); }
function addActivity(type: WorkspaceActivity["type"], project: SavedProject, detail?: string) { const activity: WorkspaceActivity = { id: makeId("activity"), createdAt: new Date().toISOString(), type, projectId: project.id, projectName: project.name, detail }; write(activityKey, [activity, ...getWorkspaceActivity()].slice(0, 80)); }

export function getWorkspaceNotifications(): WorkspaceNotification[] { return read<WorkspaceNotification[]>(notificationsKey, []).filter((item) => typeof item?.id === "string" && typeof item?.title === "string"); }
export function addWorkspaceNotification(notification: Omit<WorkspaceNotification, "id" | "createdAt" | "read">): WorkspaceNotification | null { const next: WorkspaceNotification = { ...notification, id: makeId("notice"), createdAt: new Date().toISOString(), read: false }; return write(notificationsKey, [next, ...getWorkspaceNotifications()].slice(0, 80)) ? next : null; }
export function markNotificationsRead(ids?: string[]) { const selected = ids ? new Set(ids) : null; return write(notificationsKey, getWorkspaceNotifications().map((notice) => !selected || selected.has(notice.id) ? { ...notice, read: true } : notice)); }

export function getFavorites(): string[] { return [...new Set(read<unknown[]>(favoritesKey, []).filter((id): id is string => typeof id === "string"))]; }
export function toggleFavorite(projectId: string): boolean | null { if (!getSavedProjects().some((project) => project.id === projectId)) return null; const current = getFavorites(); const exists = current.includes(projectId); return write(favoritesKey, exists ? current.filter((id) => id !== projectId) : [projectId, ...current]) ? !exists : null; }

const defaultPreferences: WorkspacePreferences = { autosave: true, quickActions: ["new", "save", "search", "favorites"] };
export function getWorkspacePreferences(): WorkspacePreferences { const value = read<Partial<WorkspacePreferences>>(preferencesKey, {}); const available = ["new", "save", "search", "favorites"] as const; return { autosave: value.autosave !== false, quickActions: Array.isArray(value.quickActions) && value.quickActions.length ? value.quickActions.filter((action): action is WorkspacePreferences["quickActions"][number] => available.includes(action as typeof available[number])) : defaultPreferences.quickActions }; }
export function saveWorkspacePreferences(preferences: WorkspacePreferences) { return write(preferencesKey, preferences); }
export function getRecentSearches(): string[] { return read<unknown[]>(recentSearchesKey, []).filter((value): value is string => typeof value === "string").slice(0, 8); }
export function addRecentSearch(query: string) { const normalized = query.trim().slice(0, 120); return !normalized || write(recentSearchesKey, [normalized, ...getRecentSearches().filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())].slice(0, 8)); }
export function getActiveProjectId(): string | null { const id = read<string | null>(activeProjectKey, null); return id && getSavedProjects().some((project) => project.id === id) ? id : null; }
export function setActiveProjectId(projectId: string | null) { return write(activeProjectKey, projectId); }

/** Saves into the active project, with deduplication and an immutable version record. */
export function persistProject(data: CalculatorProjectData, kind: Extract<SaveKind, "manual" | "autosave" | "restore">, activeProjectId: string | null): ProjectSaveResult {
  const projects = getSavedProjects();
  const existing = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
  const now = new Date().toISOString();
  const changed = !existing || JSON.stringify(existing.data) !== JSON.stringify(data);
  const project: SavedProject = existing ? { ...existing, name: projectName(data), savedAt: changed ? now : existing.savedAt, data: clone(data), calculationEngineVersion } : { version: projectSchemaVersion, id: makeId("project"), name: projectName(data), createdAt: now, savedAt: now, data: clone(data), calculationEngineVersion };
  if (changed) { const next = existing ? projects.map((candidate) => candidate.id === project.id ? project : candidate) : [project, ...projects]; if (!writeProjects(next)) return { ok: false }; }
  setActiveProjectId(project.id);
  const version = changed || !existing ? addVersion(project.id, data, kind) : undefined;
  if (changed || !existing) addActivity(existing ? "saved" : "created", project, kind);
  return { ok: true, project, changed: changed || !existing, version: version ?? undefined };
}

/** Compatibility API for existing import/duplicate flows; Phase 2 uses persistProject. */
export function saveProject(data: CalculatorProjectData): SavedProject | null { const result = persistProject(data, "manual", null); return result.ok ? result.project : null; }
export function restoreProjectVersion(projectId: string, versionId: string): ProjectSaveResult { const current = getSavedProjects().find((project) => project.id === projectId); const version = getProjectVersions(projectId).find((item) => item.id === versionId); if (!current || !version || !addVersion(projectId, current.data, "restore-safety")) return { ok: false }; const restored = persistProject(version.data, "restore", projectId); if (restored.ok) addActivity("restored", restored.project, `revision ${version.revision}`); return restored; }

export function saveRecovery(data: CalculatorProjectData): boolean { return write(recoveryKey, { data, savedAt: new Date().toISOString() }); }
export function getRecovery(): CalculatorProjectData | null { const parsed = read<{ data?: unknown } | null>(recoveryKey, null); return parsed?.data ? migrateSavedProject({ version: 4, id: "recovery", data: parsed.data })?.data ?? null : null; }

export function duplicateProject(project: SavedProject): SavedProject | null {
  const copy = clone(project.data); let sequence = 0; const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++sequence}`; const copyOpenings = <T extends { id: string; wallId?: string }>(openings: T[], wallIdMap = new Map<string, string>()) => openings.map((opening) => ({ ...opening, id: nextId("opening"), wallId: opening.wallId ? wallIdMap.get(opening.wallId) ?? opening.wallId : opening.wallId }));
  copy.rooms = copy.rooms.map((room) => { const roomWallIds = new Map(room.walls.map((wall) => [wall.id, nextId("room-wall")])); return { ...room, id: nextId("room"), doors: copyOpenings(room.doors, roomWallIds), windows: copyOpenings(room.windows, roomWallIds), walls: room.walls.map((wall) => ({ ...wall, id: roomWallIds.get(wall.id) ?? nextId("room-wall"), doors: copyOpenings(wall.doors, roomWallIds), windows: copyOpenings(wall.windows, roomWallIds), otherOpenings: copyOpenings(wall.otherOpenings, roomWallIds), structuralDeductions: copyOpenings(wall.structuralDeductions, roomWallIds) })) }; });
  copy.walls = copy.walls.map((wall) => { const id = nextId("wall"); const wallIdMap = new Map([[wall.id, id]]); return { ...wall, id, doors: copyOpenings(wall.doors, wallIdMap), windows: copyOpenings(wall.windows, wallIdMap) }; });
  copy.metadata.projectName = `${project.name} (copy)`; return saveProject(copy);
}
export function renameSavedProject(id: string, name: string): SavedProject[] | null { const projects = getSavedProjects().map((project) => project.id === id ? { ...project, name, savedAt: new Date().toISOString(), data: { ...project.data, metadata: { ...project.data.metadata, projectName: name } } } : project); return writeProjects(projects) ? projects : null; }
export function deleteSavedProject(id: string): SavedProject[] | null { const projects = getSavedProjects().filter((project) => project.id !== id); if (!writeProjects(projects)) return null; const versions = read<Record<string, ProjectVersion[]>>(versionsKey, {}); delete versions[id]; write(versionsKey, versions); write(favoritesKey, getFavorites().filter((favorite) => favorite !== id)); if (getActiveProjectId() === id) setActiveProjectId(null); return projects; }
export function recordProjectOpen(project: SavedProject) { setActiveProjectId(project.id); addActivity("opened", project); }
export function subscribeToSavedProjects(callback: () => void): () => void { if (!canUseStorage()) return () => undefined; window.addEventListener(storageEventName, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(storageEventName, callback); window.removeEventListener("storage", callback); }; }
