import type { CalculatorProjectData, SavedProject } from "@/features/calculator/types";
import { calculationEngineVersion, migrateSavedProject, projectSchemaVersion } from "@/lib/project-schema";

const storageKey = "yek-block-projects-v1";
const storageEventName = "yek-block-projects-changed";
const recoveryKey = "yek-block-recovery-v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSavedProjects(): SavedProject[] {
  if (!canUseStorage()) return [];

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsed: unknown = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.map(migrateSavedProject).filter((project): project is SavedProject => project !== null) : [];
  } catch {
    return [];
  }
}

export function saveProject(data: CalculatorProjectData): SavedProject | null {
  if (!canUseStorage()) return null;
  const existing = getSavedProjects();
  const timestamp = new Date().toISOString();
  const project: SavedProject = {
    version: projectSchemaVersion,
    id: `project-${Date.now().toString(36)}`,
    name: data.metadata.projectName.trim() || "پڕۆژەی بێ ناو",
    createdAt: timestamp,
    savedAt: timestamp,
    data,
    calculationEngineVersion,
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([project, ...existing]));
    window.dispatchEvent(new Event(storageEventName));
    return project;
  } catch { return null; }
}

export function saveRecovery(data: CalculatorProjectData): boolean {
  if (!canUseStorage()) return false;
  try { window.localStorage.setItem(recoveryKey, JSON.stringify({ data, savedAt: new Date().toISOString() })); return true; } catch { return false; }
}

export function getRecovery(): CalculatorProjectData | null {
  if (!canUseStorage()) return null;
  try { const raw = window.localStorage.getItem(recoveryKey); const parsed: unknown = raw ? JSON.parse(raw) : null; return parsed && typeof parsed === "object" && "data" in parsed ? migrateSavedProject({ version: 4, id: "recovery", data: (parsed as { data: unknown }).data })?.data ?? null : null; } catch { return null; }
}

export function duplicateProject(project: SavedProject): SavedProject | null {
  const copy = JSON.parse(JSON.stringify(project.data)) as CalculatorProjectData;
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++sequence}`;
  const copyOpenings = <T extends { id: string; wallId?: string }>(openings: T[], wallIdMap = new Map<string, string>()) => openings.map((opening) => ({ ...opening, id: nextId("opening"), wallId: opening.wallId ? wallIdMap.get(opening.wallId) ?? opening.wallId : opening.wallId }));
  copy.rooms = copy.rooms.map((room) => {
    const roomWallIds = new Map(room.walls.map((wall) => [wall.id, nextId("room-wall")]));
    return { ...room, id: nextId("room"), doors: copyOpenings(room.doors, roomWallIds), windows: copyOpenings(room.windows, roomWallIds), walls: room.walls.map((wall) => ({ ...wall, id: roomWallIds.get(wall.id) ?? nextId("room-wall"), doors: copyOpenings(wall.doors, roomWallIds), windows: copyOpenings(wall.windows, roomWallIds), otherOpenings: copyOpenings(wall.otherOpenings, roomWallIds), structuralDeductions: copyOpenings(wall.structuralDeductions, roomWallIds) })) };
  });
  copy.walls = copy.walls.map((wall) => { const id = nextId("wall"); const wallIdMap = new Map([[wall.id, id]]); return { ...wall, id, doors: copyOpenings(wall.doors, wallIdMap), windows: copyOpenings(wall.windows, wallIdMap) }; });
  copy.metadata.projectName = `${project.name} (کۆپی)`;
  return saveProject(copy);
}

export function renameSavedProject(id: string, name: string): SavedProject[] | null {
  if (!canUseStorage()) return null;
  const projects = getSavedProjects().map((project) => project.id === id ? { ...project, name, savedAt: new Date().toISOString(), data: { ...project.data, metadata: { ...project.data.metadata, projectName: name } } } : project);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(projects));
    window.dispatchEvent(new Event(storageEventName));
    return projects;
  } catch { return null; }
}

export function deleteSavedProject(id: string): SavedProject[] | null {
  if (!canUseStorage()) return null;
  const projects = getSavedProjects().filter((project) => project.id !== id);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(projects));
    window.dispatchEvent(new Event(storageEventName));
    return projects;
  } catch { return null; }
}

export function subscribeToSavedProjects(callback: () => void): () => void {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(storageEventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(storageEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

