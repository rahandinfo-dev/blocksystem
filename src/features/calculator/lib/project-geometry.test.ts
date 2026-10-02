import assert from "node:assert/strict";
import test from "node:test";

import { calculateProject } from "./calculations.ts";
import { buildFloorPlan } from "./floor-plan.ts";
import { projectNumericUnits } from "./project-geometry.ts";
import { createDefaultProject, duplicateWall } from "./project-state.ts";

test("canonical geometry supplies the same wall and openings to calculation and 2D", () => {
  const data = createDefaultProject();
  data.mode = "walls";
  data.walls = [{
    ...data.walls[0], id: "wall-a", name: "Front", length: "6", height: "2.8",
    doors: [{ id: "door-a", name: "Door", width: "0.9", height: "2.1", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "wall-a", horizontalPosition: "1", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }],
    windows: [{ id: "window-a", name: "Window", width: "1.2", height: "1.1", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "wall-a", horizontalPosition: "3", horizontalPositionUnit: "m", sillHeight: "0.9", sillHeightUnit: "m" }],
  }];
  const [unit] = projectNumericUnits(data);
  const [plan] = buildFloorPlan(data);
  const response = calculateProject({ mode: data.mode, units: projectNumericUnits(data), block: { id: "20cm", name: "Block", lengthCm: 40, heightCm: 20, thicknessCm: 20 }, wastePercentage: 0 });
  assert.equal(unit.length, 6);
  assert.equal(unit.doors[0]?.width, 0.9);
  assert.equal(unit.windows[0]?.height, 1.1);
  assert.equal(plan?.width, unit.length);
  assert.equal(plan?.openings.map((opening) => opening.id).sort().join(","), "door-a,window-a");
  assert.ok(response.isValid);
  if (response.isValid) assert.equal(response.result.totalOpeningArea, 1.89 + 1.32);
});

test("duplicated walls and openings receive new IDs without mutating the source", () => {
  const data = createDefaultProject();
  const source = {
    ...data.walls[0], id: "wall-source", name: "Source", length: "5", height: "2.8",
    doors: [{ id: "door-source", name: "Door", width: "0.9", height: "2.1", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "wall-source", horizontalPosition: "0", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }],
    windows: [],
  } as typeof data.walls[number];
  const copy = duplicateWall(source);
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.doors[0]?.id, source.doors[0]?.id);
  assert.equal(copy.doors[0]?.wallId, copy.id);
  copy.doors[0].width = "1.2";
  assert.equal(source.doors[0].width, "0.9");
});

test("project geometry stays isolated between independent project records", () => {
  const first = createDefaultProject();
  const second = createDefaultProject();
  first.mode = "walls";
  first.walls[0].length = "9";
  second.mode = "walls";
  second.walls[0].length = "4";
  assert.equal(projectNumericUnits(first)[0]?.length, 9);
  assert.equal(projectNumericUnits(second)[0]?.length, 4);
});
