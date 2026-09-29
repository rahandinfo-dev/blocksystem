import { Box3, MathUtils, Vector3 } from "three";

/** Fit all corners of the rendered bounds, including their depth, into the view. */
export function perspectiveBoundsFit(
  bounds: Box3,
  verticalFovDegrees: number,
  aspect: number,
  direction: Vector3,
  padding = 1.18,
) {
  const target = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const diagonal = Math.max(size.length(), 0.01);
  const backward = direction.clone().normalize();
  const right = new Vector3(0, 1, 0).cross(backward).normalize();
  const up = backward.clone().cross(right).normalize();
  const tangentY = Math.tan(MathUtils.degToRad(verticalFovDegrees) / 2);
  const tangentX = tangentY * Math.max(aspect, 0.01);
  let distance = diagonal * 0.05;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new Vector3(x, y, z).sub(target);
        const depth = corner.dot(backward);
        distance = Math.max(
          distance,
          depth + (Math.abs(corner.dot(right)) * padding) / tangentX,
          depth + (Math.abs(corner.dot(up)) * padding) / tangentY,
        );
      }
    }
  }

  return {
    target,
    position: target.clone().addScaledVector(backward, distance),
    distance,
    near: Math.max(0.005, Math.min(0.05, diagonal / 1000)),
    far: Math.max(100, distance * 6, diagonal * 20),
    minDistance: Math.max(0.08, diagonal * 0.03),
    maxDistance: Math.max(8, distance * 4, diagonal * 6),
  };
}
