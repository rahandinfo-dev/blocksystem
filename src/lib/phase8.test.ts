import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceBackup,
  validateWorkspaceBackup,
} from "./workspace-backup.ts";
import { createDefaultProject } from "../features/calculator/lib/project-state.ts";
import { migrateSavedProject, projectSchemaVersion } from "./project-schema.ts";
import { phase8Messages } from "./phase8-messages.ts";

test("versioned backups reject malformed, unsafe and duplicate data", () => {
  const data = createDefaultProject();
  data.metadata.projectName = "Backup test";
  const project = {
    version: projectSchemaVersion,
    id: "project-12345678-abcd",
    name: "Backup test",
    createdAt: "2026-01-01T00:00:00.000Z",
    savedAt: "2026-01-01T00:00:00.000Z",
    data,
    calculationEngineVersion: "2.2.0",
  } as const;
  const backup = createWorkspaceBackup({
    projects: [project],
    favorites: [project.id],
    preferences: { autosave: true, quickActions: ["new", "save"] },
    activity: [],
  });
  const restored = validateWorkspaceBackup(backup);
  assert.equal(restored.data.projects.length, 1);
  assert.throws(() => validateWorkspaceBackup({ ...backup, version: 2 }));
  assert.throws(() =>
    validateWorkspaceBackup(
      JSON.parse(
        '{"format":"blocksystem-backup","version":1,"createdAt":"x","data":{"__proto__":{"polluted":true},"projects":[],"favorites":[],"preferences":{},"activity":[]}}',
      ),
    ),
  );
  assert.throws(() =>
    validateWorkspaceBackup({
      ...backup,
      data: { ...backup.data, projects: [project, project] },
    }),
  );
});
test("schema migration retains legacy valid projects while rejecting invalid saved envelopes", () => {
  const data = createDefaultProject();
  const migrated = migrateSavedProject({
    id: "project-abc1234567",
    version: 1,
    savedAt: "2020-01-01T00:00:00.000Z",
    data,
  });
  assert.ok(migrated);
  assert.equal(migrated?.version, projectSchemaVersion);
  assert.equal(migrateSavedProject({ id: "", data: {} }), null);
});
test("Phase 8 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase8Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(
      Object.keys(phase8Messages[language]).sort(),
      [...keys].sort(),
    );
    assert.ok(
      keys.every(
        (key) =>
          phase8Messages[language][
            key as keyof (typeof phase8Messages)["en-GB"]
          ].trim().length > 0,
      ),
    );
  }
});
