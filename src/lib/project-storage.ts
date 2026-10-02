import type {
  CalculatorProjectData,
  ProjectVersion,
  SavedProject,
  SaveKind,
  WorkspaceActivity,
  WorkspacePreferences,
} from "@/features/calculator/types";
import {
  calculationEngineVersion,
  migrateSavedProject,
  projectSchemaVersion,
} from "./project-schema.ts";
import {
  createWorkspaceBackup,
  validateWorkspaceBackup,
  type WorkspaceBackup,
} from "./workspace-backup.ts";

const storageKey = "yek-block-projects-v1";
const recoveryKey = "yek-block-recovery-v1";
const versionsKey = "blocksystem:project-versions:v1";
const favoritesKey = "blocksystem:favorites:v1";
const activityKey = "blocksystem:activity:v1";
const preferencesKey = "blocksystem:preferences:v1";
const recentSearchesKey = "blocksystem:recent-searches:v1";
const activeProjectKey = "blocksystem:active-project:v1";
const storageEventName = "yek-block-projects-changed";
const readCache = new Map<string, { raw: string | null; value: unknown }>();

export type ProjectSaveResult =
  | {
      ok: true;
      project: SavedProject;
      changed: boolean;
      version?: ProjectVersion;
    }
  | { ok: false };

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function read<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const cached = readCache.get(key);
    if (cached?.raw === raw) return cached.value === null ? fallback : (cached.value as T);
    const value: unknown = JSON.parse(raw ?? "null");
    readCache.set(key, { raw, value });
    return value === null ? fallback : (value as T);
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): boolean {
  if (!canUseStorage()) return false;
  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(key, raw);
    readCache.set(key, { raw, value });
    window.dispatchEvent(new Event(storageEventName));
    return true;
  } catch {
    return false;
  }
}
function projectName(data: CalculatorProjectData) {
  return data.metadata.projectName.trim() || "Untitled project";
}
function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function getSavedProjects(): SavedProject[] {
  return read<unknown[]>(storageKey, [])
    .map(migrateSavedProject)
    .filter((project): project is SavedProject => project !== null);
}
function writeProjects(projects: SavedProject[]) {
  return write(storageKey, projects);
}
export function replaceSavedProjects(projects: SavedProject[]) { return writeProjects(projects.map(clone)); }
export function getProjectVersions(projectId: string): ProjectVersion[] {
  return (
    read<Record<string, ProjectVersion[]>>(versionsKey, {})[projectId] ?? []
  );
}

function addVersion(
  projectId: string,
  data: CalculatorProjectData,
  saveKind: SaveKind,
): ProjectVersion | null {
  const all = read<Record<string, ProjectVersion[]>>(versionsKey, {});
  const current = all[projectId] ?? [];
  const previous = current[0];
  if (
    previous &&
    JSON.stringify(previous.data) === JSON.stringify(data) &&
    saveKind === "autosave"
  )
    return null;
  const version: ProjectVersion = {
    id: makeId("version"),
    projectId,
    revision: (previous?.revision ?? 0) + 1,
    savedAt: new Date().toISOString(),
    saveKind,
    data: clone(data),
  };
  all[projectId] = [version, ...current].slice(0, 60);
  return write(versionsKey, all) ? version : null;
}

export function getWorkspaceActivity(): WorkspaceActivity[] {
  return read<WorkspaceActivity[]>(activityKey, []).filter(
    (item) =>
      typeof item?.id === "string" && typeof item?.createdAt === "string",
  );
}
function addActivity(
  type: WorkspaceActivity["type"],
  project: SavedProject,
  detail?: string,
) {
  const activity: WorkspaceActivity = {
    id: makeId("activity"),
    createdAt: new Date().toISOString(),
    type,
    projectId: project.id,
    projectName: project.name.slice(0, 160),
    detail: detail?.slice(0, 160),
  };
  write(activityKey, [activity, ...getWorkspaceActivity()].slice(0, 80));
}
function addGlobalActivity(
  type: Extract<
    WorkspaceActivity["type"],
    "backup-created" | "backup-restored"
  >,
) {
  const activity: WorkspaceActivity = {
    id: makeId("activity"),
    createdAt: new Date().toISOString(),
    type,
    projectName: "Workspace",
  };
  write(activityKey, [activity, ...getWorkspaceActivity()].slice(0, 80));
}

export function getFavorites(): string[] {
  return [
    ...new Set(
      read<unknown[]>(favoritesKey, []).filter(
        (id): id is string => typeof id === "string",
      ),
    ),
  ];
}
export function toggleFavorite(projectId: string): boolean | null {
  if (!getSavedProjects().some((project) => project.id === projectId))
    return null;
  const current = getFavorites();
  const exists = current.includes(projectId);
  return write(
    favoritesKey,
    exists ? current.filter((id) => id !== projectId) : [projectId, ...current],
  )
    ? !exists
    : null;
}

const defaultPreferences: WorkspacePreferences = {
  autosave: true,
  quickActions: ["new", "save", "search", "favorites"],
};
export function getWorkspacePreferences(): WorkspacePreferences {
  const value = read<Partial<WorkspacePreferences>>(preferencesKey, {});
  const available = ["new", "save", "search", "favorites"] as const;
  return {
    autosave: value.autosave !== false,
    quickActions:
      Array.isArray(value.quickActions) && value.quickActions.length
        ? value.quickActions.filter(
            (action): action is WorkspacePreferences["quickActions"][number] =>
              available.includes(action as (typeof available)[number]),
          )
        : defaultPreferences.quickActions,
  };
}
export function saveWorkspacePreferences(preferences: WorkspacePreferences) {
  return write(preferencesKey, preferences);
}
export function getRecentSearches(): string[] {
  return read<unknown[]>(recentSearchesKey, [])
    .filter((value): value is string => typeof value === "string")
    .slice(0, 8);
}
export function addRecentSearch(query: string) {
  const normalized = query.trim().slice(0, 120);
  return (
    !normalized ||
    write(
      recentSearchesKey,
      [
        normalized,
        ...getRecentSearches().filter(
          (item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
        ),
      ].slice(0, 8),
    )
  );
}
export function getActiveProjectId(): string | null {
  const id = read<string | null>(activeProjectKey, null);
  return id && getSavedProjects().some((project) => project.id === id)
    ? id
    : null;
}
export function setActiveProjectId(projectId: string | null) {
  return write(activeProjectKey, projectId);
}

/** Saves into the active project, with deduplication and an immutable version record. */
export function persistProject(
  data: CalculatorProjectData,
  kind: Extract<SaveKind, "manual" | "autosave" | "restore">,
  activeProjectId: string | null,
): ProjectSaveResult {
  const projects = getSavedProjects();
  const existing = activeProjectId
    ? projects.find((project) => project.id === activeProjectId)
    : undefined;
  const now = new Date().toISOString();
  const changed =
    !existing || JSON.stringify(existing.data) !== JSON.stringify(data);
  const project: SavedProject = existing
    ? {
        ...existing,
        name: projectName(data),
        savedAt: changed ? now : existing.savedAt,
        data: clone(data),
        calculationEngineVersion,
      }
    : {
        version: projectSchemaVersion,
        id: makeId("project"),
        name: projectName(data),
        createdAt: now,
        savedAt: now,
        data: clone(data),
        calculationEngineVersion,
      };
  if (changed) {
    const next = existing
      ? projects.map((candidate) =>
          candidate.id === project.id ? project : candidate,
        )
      : [project, ...projects];
    if (!writeProjects(next)) return { ok: false };
  }
  setActiveProjectId(project.id);
  const version =
    changed || !existing ? addVersion(project.id, data, kind) : undefined;
  if (changed || !existing)
    addActivity(existing ? "saved" : "created", project, kind);
  return {
    ok: true,
    project,
    changed: changed || !existing,
    version: version ?? undefined,
  };
}

/** Compatibility API for existing import/duplicate flows; Phase 2 uses persistProject. */
export function saveProject(data: CalculatorProjectData): SavedProject | null {
  const result = persistProject(data, "manual", null);
  return result.ok ? result.project : null;
}
export function restoreProjectVersion(
  projectId: string,
  versionId: string,
): ProjectSaveResult {
  const current = getSavedProjects().find(
    (project) => project.id === projectId,
  );
  const version = getProjectVersions(projectId).find(
    (item) => item.id === versionId,
  );
  if (
    !current ||
    !version ||
    !addVersion(projectId, current.data, "restore-safety")
  )
    return { ok: false };
  const restored = persistProject(version.data, "restore", projectId);
  if (restored.ok)
    addActivity("restored", restored.project, `revision ${version.revision}`);
  return restored;
}

export function saveRecovery(data: CalculatorProjectData): boolean {
  return write(recoveryKey, { data, savedAt: new Date().toISOString() });
}
export function getRecovery(): CalculatorProjectData | null {
  const parsed = read<{ data?: unknown; savedAt?: unknown } | null>(
    recoveryKey,
    null,
  );
  if (
    !parsed?.data ||
    typeof parsed.savedAt !== "string" ||
    Date.now() - Date.parse(parsed.savedAt) > 1000 * 60 * 60 * 24 * 30
  )
    return null;
  return (
    migrateSavedProject({ version: 6, id: "recovery", data: parsed.data })
      ?.data ?? null
  );
}

export function downloadWorkspaceBackup(): WorkspaceBackup | null {
  if (!canUseStorage()) return null;
  const backup = createWorkspaceBackup({
    projects: getSavedProjects(),
    favorites: getFavorites(),
    preferences: getWorkspacePreferences(),
    activity: getWorkspaceActivity(),
  });
  addGlobalActivity("backup-created");
  return backup;
}
/** Validates and prepares every structure before altering primary persisted data. */
export function restoreWorkspaceBackup(raw: unknown): boolean {
  if (!canUseStorage()) return false;
  let backup: WorkspaceBackup;
  try {
    backup = validateWorkspaceBackup(raw);
  } catch {
    return false;
  }
  const previous = {
    projects: window.localStorage.getItem(storageKey),
    favorites: window.localStorage.getItem(favoritesKey),
    preferences: window.localStorage.getItem(preferencesKey),
    activity: window.localStorage.getItem(activityKey),
    active: window.localStorage.getItem(activeProjectKey),
  };
  // Recovery is written first; on a later write failure all primary keys are restored.
  if (
    !write(recoveryKey, {
      backup: createWorkspaceBackup({
        projects: getSavedProjects(),
        favorites: getFavorites(),
        preferences: getWorkspacePreferences(),
        activity: getWorkspaceActivity(),
      }),
      savedAt: new Date().toISOString(),
    })
  )
    return false;
  try {
    if (
      !write(storageKey, backup.data.projects) ||
      !write(favoritesKey, backup.data.favorites) ||
      !write(preferencesKey, backup.data.preferences) ||
      !write(activityKey, backup.data.activity) ||
      !write(activeProjectKey, null)
    )
      throw new Error("write failed");
    addGlobalActivity("backup-restored");
    return true;
  } catch {
    readCache.clear();
    for (const [key, value] of [
      [storageKey, previous.projects],
      [favoritesKey, previous.favorites],
      [preferencesKey, previous.preferences],
      [activityKey, previous.activity],
      [activeProjectKey, previous.active],
    ] as const) {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    }
    return false;
  }
}

export function duplicateProject(project: SavedProject, copySuffix = "copy"): SavedProject | null {
  const copy = clone(project.data);
  let sequence = 0;
  const nextId = (prefix: string) =>
    `${prefix}-${Date.now().toString(36)}-${++sequence}`;
  const copyOpenings = <T extends { id: string; wallId?: string }>(
    openings: T[],
    wallIdMap = new Map<string, string>(),
  ) =>
    openings.map((opening) => ({
      ...opening,
      id: nextId("opening"),
      wallId: opening.wallId
        ? (wallIdMap.get(opening.wallId) ?? opening.wallId)
        : opening.wallId,
    }));
  copy.rooms = copy.rooms.map((room) => {
    const roomWallIds = new Map(
      room.walls.map((wall) => [wall.id, nextId("room-wall")]),
    );
    return {
      ...room,
      id: nextId("room"),
      doors: copyOpenings(room.doors, roomWallIds),
      windows: copyOpenings(room.windows, roomWallIds),
      walls: room.walls.map((wall) => ({
        ...wall,
        id: roomWallIds.get(wall.id) ?? nextId("room-wall"),
        doors: copyOpenings(wall.doors, roomWallIds),
        windows: copyOpenings(wall.windows, roomWallIds),
        otherOpenings: copyOpenings(wall.otherOpenings, roomWallIds),
        structuralDeductions: copyOpenings(
          wall.structuralDeductions,
          roomWallIds,
        ),
      })),
    };
  });
  copy.walls = copy.walls.map((wall) => {
    const id = nextId("wall");
    const wallIdMap = new Map([[wall.id, id]]);
    return {
      ...wall,
      id,
      doors: copyOpenings(wall.doors, wallIdMap),
      windows: copyOpenings(wall.windows, wallIdMap),
    };
  });
  if (copy.scenarioComparison) {
    const scenarioIds = new Map(
      copy.scenarioComparison.scenarios.map((scenario) => [
        scenario.id,
        nextId("scenario"),
      ]),
    );
    copy.scenarioComparison = {
      ...copy.scenarioComparison,
      scenarios: copy.scenarioComparison.scenarios.map((scenario) => ({
        ...scenario,
        id: scenarioIds.get(scenario.id) ?? nextId("scenario"),
      })),
      baselineScenarioId: copy.scenarioComparison.baselineScenarioId
        ? scenarioIds.get(copy.scenarioComparison.baselineScenarioId)
        : undefined,
      activeScenarioId: copy.scenarioComparison.activeScenarioId
        ? scenarioIds.get(copy.scenarioComparison.activeScenarioId)
        : undefined,
    };
  }
  copy.metadata.projectName = `${project.name} — ${copySuffix.trim() || "copy"}`;
  return saveProject(copy);
}
export function renameSavedProject(
  id: string,
  name: string,
): SavedProject[] | null {
  const projects = getSavedProjects().map((project) =>
    project.id === id
      ? {
          ...project,
          name,
          savedAt: new Date().toISOString(),
          data: {
            ...project.data,
            metadata: { ...project.data.metadata, projectName: name },
          },
        }
      : project,
  );
  if (!writeProjects(projects)) return null;
  return projects;
}
export function setProjectStatus(
  id: string,
  status: CalculatorProjectData["metadata"]["status"],
): SavedProject[] | null {
  const projects = getSavedProjects().map((project) =>
    project.id === id
      ? {
          ...project,
          savedAt: new Date().toISOString(),
          data: {
            ...project.data,
            metadata: { ...project.data.metadata, status },
          },
        }
      : project,
  );
  if (!writeProjects(projects)) return null;
  return projects;
}
export function deleteSavedProject(id: string): SavedProject[] | null {
  const target = getSavedProjects().find((project) => project.id === id);
  if (!target) return null;
  saveRecovery(target.data);
  const projects = getSavedProjects().filter((project) => project.id !== id);
  if (!writeProjects(projects)) return null;
  const versions = read<Record<string, ProjectVersion[]>>(versionsKey, {});
  delete versions[id];
  write(versionsKey, versions);
  write(
    favoritesKey,
    getFavorites().filter((favorite) => favorite !== id),
  );
  if (getActiveProjectId() === id) setActiveProjectId(null);
  addActivity("deleted", target);
  return projects;
}
export function recordProjectOpen(project: SavedProject) {
  setActiveProjectId(project.id);
  addActivity("opened", project);
}
export function subscribeToSavedProjects(callback: () => void): () => void {
  if (!canUseStorage()) return () => undefined;
  const invalidate = () => { readCache.clear(); callback(); };
  window.addEventListener(storageEventName, invalidate);
  window.addEventListener("storage", invalidate);
  return () => {
    window.removeEventListener(storageEventName, invalidate);
    window.removeEventListener("storage", invalidate);
  };
}
