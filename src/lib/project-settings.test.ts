import assert from "node:assert/strict";
import test from "node:test";
import { blockDefinitions } from "../features/calculator/config/blocks.ts";
import { calculateProject } from "../features/calculator/lib/calculations.ts";
import { projectNumericUnits } from "../features/calculator/lib/scenario-engine.ts";
import { createDefaultProject } from "../features/calculator/lib/project-state.ts";
import { convertLength } from "./units.ts";
import { migrateSavedProject } from "./project-schema.ts";
import { projectSettingsMessages } from "./project-settings-messages.ts";
import { phase3Messages } from "./phase3-messages.ts";
import { matchesProjectSearch } from "./project-search.ts";
import { deleteSavedProject, duplicateProject, getSavedProjects, persistProject, replaceSavedProjects } from "./project-storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const browser = new EventTarget() as EventTarget & { localStorage: MemoryStorage };
browser.localStorage = new MemoryStorage();
Object.defineProperty(globalThis, "window", { value: browser, configurable: true });

test("project settings labels are complete and use the clarified Kurdish terms", () => {
  const keys = Object.keys(projectSettingsMessages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(Object.keys(projectSettingsMessages[language]).sort(), [...keys].sort());
    assert.ok(keys.every((key) => projectSettingsMessages[language][key as keyof typeof projectSettingsMessages["en-GB"]].trim().length > 0));
  }
  assert.equal(phase3Messages.ku["project.draft"], "تەواونەکراو");
  assert.equal(phase3Messages.ku["project.metric"], "مەترێک (م، سم، ملم)");
  assert.equal(phase3Messages.ku["project.imperial"], "ئیمپریاڵ (پێ، ئینچ)");
  assert.equal(projectSettingsMessages.ku["blocks.heading"], "بلۆک");
});

test("legacy project status values remain compatible with saved projects", () => {
  const data = createDefaultProject();
  data.metadata.status = "draft";
  const migrated = migrateSavedProject({
    id: "project-settings-legacy",
    version: 4,
    savedAt: "2026-10-02T00:00:00.000Z",
    data,
  });
  assert.equal(migrated?.data.metadata.status, "draft");
  assert.equal(migrated?.data.metadata.measurementSystem, "metric");
});

test("metric and imperial conversions remain accurate", () => {
  assert.equal(convertLength(1, "m", "ft"), 3.28083989501312);
  assert.equal(convertLength(12, "in", "ft"), 1);
  assert.equal(convertLength(1000, "mm", "m"), 1);
});

test("project search matches name, reference, owner, and Kurdish text", () => {
  const data = createDefaultProject();
  data.metadata.projectName = "خانووی نوێ";
  data.metadata.projectNumber = "BS-42";
  data.metadata.ownerName = "Sara Ahmed";
  const project = { version: 6 as const, id: "project-search", name: data.metadata.projectName, createdAt: "2026-10-02T00:00:00.000Z", savedAt: "2026-10-02T00:00:00.000Z", data };
  assert.equal(matchesProjectSearch(project, "خانوو"), true);
  assert.equal(matchesProjectSearch(project, "bs-42"), true);
  assert.equal(matchesProjectSearch(project, "sara"), true);
  assert.equal(matchesProjectSearch(project, "missing"), false);
});

test("local persistence creates, restores, isolates, duplicates, and deletes projects safely", () => {
  replaceSavedProjects([]);
  const first = createDefaultProject();
  first.metadata.projectName = "House";
  first.metadata.projectNumber = "BS-001";
  const saved = persistProject(first, "autosave", null);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(getSavedProjects().length, 1);

  const original = getSavedProjects()[0];
  const duplicate = duplicateProject(original, "Copy");
  assert.ok(duplicate);
  if (!duplicate) return;
  assert.notEqual(duplicate.id, original.id);
  assert.equal(duplicate.name, "House — Copy");
  assert.equal(original.data.metadata.projectName, "House");
  duplicate.data.rooms[0].name = "Changed copy room";
  assert.notEqual(original.data.rooms[0].name, duplicate.data.rooms[0].name);
  assert.equal(getSavedProjects().length, 2);
  assert.ok(duplicate.createdAt);
  assert.ok(duplicate.savedAt);

  deleteSavedProject(duplicate.id);
  const restored = getSavedProjects();
  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, original.id);
});

test("Quick and Advanced modes use their existing, distinct geometry mappings", () => {
  const project = createDefaultProject();
  const quick = projectNumericUnits(project);
  assert.equal(quick.length, 1);
  assert.equal(quick[0]?.kind, "room");

  project.settings.interfaceMode = "advanced";
  const advanced = projectNumericUnits(project);
  assert.equal(advanced.length, 4);
  assert.ok(advanced.every((unit) => unit.kind === "wall"));
  assert.ok(advanced.every((unit) => "structuralDeductions" in unit));
});

test("block presets and mortar calculations retain their established behavior", () => {
  assert.deepEqual(blockDefinitions.map((block) => block.id), ["10cm", "20cm", "30cm"]);
  const input = {
    mode: "walls" as const,
    units: [{ id: "wall", name: "Wall", kind: "wall" as const, length: 4, height: 3.1, doors: [], windows: [] }],
    block: blockDefinitions[1],
    wastePercentage: 5,
    unitPrice: 1000,
    currency: "IQD" as const,
    mortarConsumptionM3PerM2: 0.02,
    costExtras: { mortarCost: 2500 },
  };
  const withoutJoint = calculateProject({ ...input, mortarJointThicknessCm: 0 });
  const withJoint = calculateProject({ ...input, mortarJointThicknessCm: 1 });
  assert.ok(withoutJoint.isValid && withJoint.isValid);
  if (!withoutJoint.isValid || !withJoint.isValid) return;
  assert.equal(withoutJoint.result.recommendedBlocks, withJoint.result.recommendedBlocks);
  assert.ok(withJoint.result.units[0].estimatedRows < withoutJoint.result.units[0].estimatedRows);
  assert.ok(Math.abs((withJoint.result.mortar?.estimatedVolumeM3 ?? 0) - 0.248) < 1e-12);
  assert.equal(withJoint.result.cost?.mortarCost, 2500);
  assert.equal(withJoint.result.cost?.grandTotal, withJoint.result.cost!.recommendedTotalCost + 2500);
});
