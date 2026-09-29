import assert from "node:assert/strict";
import test from "node:test";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { perspectiveBoundsFit } from "./camera-fit.ts";

const viewports = [
  [320, 568], [360, 800], [375, 667], [375, 812], [390, 844], [393, 852], [414, 896], [430, 932],
  [568, 320], [667, 375], [812, 375], [844, 390], [852, 393], [896, 414], [932, 430],
  [768, 1024], [820, 1180], [1024, 1366],
  [1280, 720], [1366, 768], [1440, 900], [1920, 1080],
];

test("fits every model corner with padding across the requested viewport matrix", () => {
  const models = [
    new Box3(new Vector3(-3.2, -0.05, -0.12), new Vector3(3.2, 3.2, 4.12)),
    new Box3(new Vector3(-15.2, 0, -0.12), new Vector3(15.2, 2.6, 0.12)),
    new Box3(new Vector3(-0.6, 0, -0.12), new Vector3(0.6, 12.3, 0.12)),
    new Box3(new Vector3(-1.2, 0, -0.12), new Vector3(1.2, 3.1, 30.12)),
  ];
  for (const bounds of models) {
    for (const [width, height] of viewports) {
      const camera = new PerspectiveCamera(42, width / height);
      const fitted = perspectiveBoundsFit(bounds, camera.fov, camera.aspect, new Vector3(1, 0.72, 1.2));
      camera.position.copy(fitted.position);
      camera.near = fitted.near;
      camera.far = fitted.far;
      camera.lookAt(fitted.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      let greatestExtent = 0;
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = new Vector3(x, y, z).project(camera);
            greatestExtent = Math.max(greatestExtent, Math.abs(projected.x), Math.abs(projected.y));
            assert.ok(Math.abs(projected.x) <= 1 / 1.18 + 1e-9, `horizontal clipping at ${width}x${height}`);
            assert.ok(Math.abs(projected.y) <= 1 / 1.18 + 1e-9, `vertical clipping at ${width}x${height}`);
            assert.ok(projected.z > -1 && projected.z < 1, `depth clipping at ${width}x${height}`);
          }
        }
      }
      assert.ok(greatestExtent > 0.8, "model should occupy the view rather than appear microscopic");
      assert.ok(fitted.distance < fitted.maxDistance && fitted.distance > fitted.minDistance);
    }
  }
});

test("recomputes a centred fit when live bounds and canvas aspect change", () => {
  const bounds = new Box3(new Vector3(-3, 0, -0.1), new Vector3(3, 2.8, 4.1));
  const direction = new Vector3(1, 0.72, 1.2);
  const portrait = perspectiveBoundsFit(bounds, 42, 390 / 844, direction);
  const landscape = perspectiveBoundsFit(bounds, 42, 844 / 390, direction);
  assert.ok(portrait.distance > landscape.distance);
  bounds.max.set(18, 6, 9);
  const updated = perspectiveBoundsFit(bounds, 42, 844 / 390, direction);
  assert.deepEqual(updated.target.toArray(), bounds.getCenter(new Vector3()).toArray());
  assert.ok(updated.distance > landscape.distance);
});
