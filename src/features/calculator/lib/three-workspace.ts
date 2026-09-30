export type WorldPoint = Readonly<{ x: number; y: number; z: number }>;
export type SectionAxis = "x" | "y" | "z";
export type DistanceUnit = "mm" | "cm" | "m";

const finite = (value: number) => Number.isFinite(value);

/** World-space utility functions for the 3D viewer. They deliberately never mutate project geometry. */
export function worldDistance(from: WorldPoint, to: WorldPoint) {
  if (![from.x, from.y, from.z, to.x, to.y, to.z].every(finite)) return 0;
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

export function displayDistance(metres: number, unit: DistanceUnit) {
  const safe = finite(metres) ? Math.max(0, metres) : 0;
  if (unit === "mm") return safe * 1000;
  if (unit === "cm") return safe * 100;
  return safe;
}

export function clampSectionPosition(value: number, extent: number) {
  const safeExtent = finite(extent) ? Math.max(0.01, extent) : 0.01;
  const safeValue = finite(value) ? value : 0;
  return Math.min(safeExtent, Math.max(-safeExtent, safeValue));
}

/** Stable, non-accumulating visual offsets for exploded view. */
export function explodedOffset(key: string, amount: number): [number, number, number] {
  const distance = finite(amount) ? Math.max(0, amount) : 0;
  if (key.includes("front")) return [0, 0, -distance];
  if (key.includes("back")) return [0, 0, distance];
  if (key.includes("right")) return [distance, 0, 0];
  if (key.includes("left")) return [-distance, 0, 0];
  if (key.includes("door")) return [0, distance * 0.22, -distance * 0.32];
  if (key.includes("window")) return [0, distance * 0.22, distance * 0.32];
  return [0, distance * 0.16, 0];
}

export function screenshotFilename(projectName: string) {
  const base = projectName
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "blocksystem-3d";
  return `${base}-3d.png`;
}
