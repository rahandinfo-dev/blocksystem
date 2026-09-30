import assert from "node:assert/strict";
import test from "node:test";
import { convertLength } from "../../../lib/units.ts";
import { createDefaultProject } from "./project-state.ts";
import { buildEngineeringTakeoff, takeoffCsv, validateEngineeringProject } from "./engineering-takeoff.ts";

function project() { const data = createDefaultProject(); data.mode = "walls"; data.metadata.projectName = "Takeoff fixture"; data.walls = [{ id: "wall-1", name: "Wall 1", length: "6", height: "3", lengthUnit: "m", heightUnit: "m", doors: [{ id: "door-1", name: "Door", width: "1", height: "2", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "wall-1", horizontalPosition: "0", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }], windows: [] }]; data.settings.selectedBlockId = "20cm"; data.settings.wastePreset = "5"; data.settings.unitPrice = "1000"; return data; }
test("engineering takeoff delegates totals and waste to the authoritative calculation engine", () => {
  const takeoff = buildEngineeringTakeoff(project()); assert.ok(takeoff.result); assert.equal(takeoff.result?.grossWallArea, 18); assert.equal(takeoff.result?.totalDoorArea, 2); assert.equal(takeoff.result?.netWallArea, 16); assert.equal(takeoff.result?.wasteBlocks, Math.ceil(takeoff.result!.requiredBlocks * 0.05)); assert.equal(takeoff.boq[0]?.quantity, takeoff.result?.recommendedBlocks); assert.equal(takeoff.boq.reduce((sum, row) => sum + row.amount, 0), takeoff.result?.cost?.grandTotal); assert.match(takeoffCsv(takeoff), /^\uFEFF/);
});
test("engineering validation reports invalid geometry and oversized openings", () => {
  const invalid = project(); invalid.walls[0].length = "-1"; const issues = validateEngineeringProject(invalid); assert.ok(issues.some((issue) => issue.code === "WALL_DIMENSION_INVALID")); assert.ok(issues.some((issue) => issue.severity === "ERROR"));
  const oversized = project(); oversized.walls[0].doors[0].width = "10"; const takeoff = buildEngineeringTakeoff(oversized); assert.equal(takeoff.result, undefined); assert.ok(takeoff.issues.some((issue) => issue.code === "CALCULATION_OPENINGS_TOO_LARGE"));
});
test("equivalent canonical metric lengths remain physically equal", () => {
  assert.equal(convertLength(1, "m", "m"), convertLength(100, "cm", "m")); assert.equal(convertLength(1, "m", "m"), convertLength(1000, "mm", "m"));
});
