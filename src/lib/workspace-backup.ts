import type {
  SavedProject,
  WorkspaceActivity,
  WorkspacePreferences,
} from "@/features/calculator/types";
import { migrateSavedProject } from "./project-schema.ts";
export const backupVersion = 1 as const;
export type WorkspaceBackup = {
  format: "blocksystem-backup";
  version: typeof backupVersion;
  createdAt: string;
  applicationVersion: string;
  data: {
    projects: SavedProject[];
    favorites: string[];
    preferences: WorkspacePreferences;
    activity: WorkspaceActivity[];
  };
};
function plain(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || ["string", "number", "boolean"].includes(typeof value))
    return true;
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    return value.every((item) => plain(item, seen));
  }
  if (
    !value ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).every(
    ([key, item]) =>
      key !== "__proto__" &&
      key !== "constructor" &&
      key !== "prototype" &&
      plain(item, seen),
  );
}
export function createWorkspaceBackup(
  input: WorkspaceBackup["data"],
): WorkspaceBackup {
  return {
    format: "blocksystem-backup",
    version: backupVersion,
    createdAt: new Date().toISOString(),
    applicationVersion: "1.0.0",
    data: {
      projects: input.projects.map((project) =>
        JSON.parse(JSON.stringify(project)) as SavedProject,
      ),
      favorites: [...new Set(input.favorites)]
        .filter((id) => typeof id === "string")
        .slice(0, 1000),
      preferences: {
        autosave: input.preferences.autosave !== false,
        quickActions: input.preferences.quickActions.slice(0, 4),
      },
      activity: input.activity
        .filter(
          (item) =>
            typeof item?.id === "string" && typeof item.createdAt === "string",
        )
        .slice(0, 80),
    },
  };
}
export function validateWorkspaceBackup(value: unknown): WorkspaceBackup {
  if (!plain(value) || !value || typeof value !== "object")
    throw new Error("Invalid backup");
  const backup = value as Partial<WorkspaceBackup>;
  if (
    backup.format !== "blocksystem-backup" ||
    backup.version !== backupVersion ||
    !backup.data ||
    typeof backup.createdAt !== "string"
  )
    throw new Error("Unsupported backup");
  const data = backup.data as WorkspaceBackup["data"];
  if (
    !Array.isArray(data.projects) ||
    data.projects.length > 500 ||
    !Array.isArray(data.favorites) ||
    !Array.isArray(data.activity) ||
    !data.preferences
  )
    throw new Error("Invalid backup data");
  const ids = new Set<string>();
  const projects = data.projects.map((item) => {
    const migrated = migrateSavedProject(item);
    if (
      !migrated ||
      !/^project-[a-z0-9-]{10,}$/i.test(migrated.id) ||
      ids.has(migrated.id)
    )
      throw new Error("Invalid project");
    ids.add(migrated.id);
    return migrated;
  });
  return createWorkspaceBackup({
    projects,
    favorites: data.favorites,
    preferences: data.preferences,
    activity: data.activity,
  });
}
