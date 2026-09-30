import assert from "node:assert/strict";
import test from "node:test";
import { clampSectionPosition, displayDistance, explodedOffset, screenshotFilename, worldDistance } from "./three-workspace.ts";

test("3D measurement uses engineering world coordinates rather than viewport pixels", () => {
  assert.equal(worldDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 4 }), 5);
  assert.equal(displayDistance(1, "m"), 1);
  assert.equal(displayDistance(1, "cm"), 100);
  assert.equal(displayDistance(1, "mm"), 1000);
});

test("section and exploded-view values remain bounded, finite, and visual-only", () => {
  assert.equal(clampSectionPosition(20, 4), 4);
  assert.equal(clampSectionPosition(-20, 4), -4);
  assert.equal(clampSectionPosition(Number.NaN, 4), 0);
  assert.deepEqual(explodedOffset("wall:front", 0.6), [0, 0, -0.6]);
  assert.deepEqual(explodedOffset("wall:right", 0.6), [0.6, 0, 0]);
  assert.deepEqual(explodedOffset("door:1", 0.6), [0, 0.132, -0.192]);
});

test("screenshot names are filesystem-safe and do not expose internal identities", () => {
  assert.equal(screenshotFilename("Project / A : 01"), "Project-A-01-3d.png");
  assert.equal(screenshotFilename("   "), "blocksystem-3d-3d.png");
});
