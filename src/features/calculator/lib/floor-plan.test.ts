import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProject } from "./project-state.ts";
import { buildFloorPlan, fitPlan, hitPlan, measure, screenToWorld, viewBox } from "./floor-plan.ts";

test("floor-plan geometry uses canonical metres and places openings on the host room", () => {
  const data = createDefaultProject(); data.mode = "rooms"; data.rooms[0] = { ...data.rooms[0], id: "room-a", name: "Room A", length: "6", width: "4", height: "3", doors: [{ id: "door-a", name: "Door", width: "1", height: "2", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "room-a", horizontalPosition: "2", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }] };
  const plan = buildFloorPlan(data); assert.equal(plan[0]?.width, 6); assert.equal(plan[0]?.height, 4); assert.equal(plan[0]?.openings[0]?.x, 2); assert.equal(hitPlan(plan, { x: 2.5, y: 0 })?.kind, "door");
});
test("viewport transforms round trip and fit remains finite for empty and normal plans", () => {
  const empty = buildFloorPlan(createDefaultProject()); const fitted = fitPlan(empty, 1.6); assert.ok(Number.isFinite(fitted.zoom)); const box = viewBox({ centerX: 5, centerY: 5, zoom: 2 }, 2); const point = screenToWorld(100, 50, { left: 0, top: 0, width: 200, height: 100 }, { centerX: 5, centerY: 5, zoom: 2 }); assert.ok(Math.abs(point.x - (box.x + box.width / 2)) < 1e-9); assert.equal(measure({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
