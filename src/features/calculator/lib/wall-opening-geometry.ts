/**
 * Planar wall geometry used by the 3D preview.  Each returned rectangle is a
 * solid part of the wall; together they cover the wall face except for the
 * supplied opening rectangles.  Rendering every segment at the full wall
 * depth produces a real through-wall void without relying on an expensive or
 * fragile runtime boolean operation.
 */
export interface WallOpeningRect {
  id: string;
  /** Horizontal centre measured in the wall's local coordinate system. */
  x: number;
  /** Height of the opening's lower edge above the finished floor. */
  bottom: number;
  width: number;
  height: number;
}

export interface WallSolidSegment {
  /** Horizontal centre measured in the wall's local coordinate system. */
  x: number;
  /** Vertical centre measured above the finished floor. */
  y: number;
  width: number;
  height: number;
}

const epsilon = 0.000001;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

interface NormalizedOpeningRect extends WallOpeningRect {
  left: number;
  right: number;
  top: number;
}

/**
 * Bounds and normalizes opening rectangles before they are used to cut a
 * wall.  Invalid or zero-area requests intentionally do not create a hole.
 */
export function normalizeWallOpeningRects(
  length: number,
  height: number,
  openings: readonly WallOpeningRect[],
): NormalizedOpeningRect[] {
  if (!finite(length) || !finite(height) || length <= epsilon || height <= epsilon) {
    return [];
  }

  return openings.flatMap((opening) => {
    if (
      !finite(opening.x) ||
      !finite(opening.bottom) ||
      !finite(opening.width) ||
      !finite(opening.height) ||
      opening.width <= epsilon ||
      opening.height <= epsilon
    ) {
      return [];
    }

    const left = clamp(opening.x - opening.width / 2, -length / 2, length / 2);
    const right = clamp(opening.x + opening.width / 2, -length / 2, length / 2);
    const bottom = clamp(opening.bottom, 0, height);
    const top = clamp(opening.bottom + opening.height, 0, height);
    if (right - left <= epsilon || top - bottom <= epsilon) return [];

    return [{ ...opening, left, right, bottom, top }];
  });
}

function segmentFromBounds(
  left: number,
  right: number,
  bottom: number,
  top: number,
): WallSolidSegment | undefined {
  const width = right - left;
  const height = top - bottom;
  if (width <= epsilon || height <= epsilon) return undefined;
  return { x: (left + right) / 2, y: (bottom + top) / 2, width, height };
}

function subtractOpening(
  segment: WallSolidSegment,
  opening: NormalizedOpeningRect,
): WallSolidSegment[] {
  const segmentLeft = segment.x - segment.width / 2;
  const segmentRight = segment.x + segment.width / 2;
  const segmentBottom = segment.y - segment.height / 2;
  const segmentTop = segment.y + segment.height / 2;
  const left = Math.max(segmentLeft, opening.left);
  const right = Math.min(segmentRight, opening.right);
  const bottom = Math.max(segmentBottom, opening.bottom);
  const top = Math.min(segmentTop, opening.top);

  if (right - left <= epsilon || top - bottom <= epsilon) return [segment];

  // Four non-overlapping pieces partition the remaining material. Keeping
  // these rectangles rather than a full x/y grid prevents a large opening
  // set from creating thousands of WebGL meshes.
  return [
    segmentFromBounds(segmentLeft, left, segmentBottom, segmentTop),
    segmentFromBounds(right, segmentRight, segmentBottom, segmentTop),
    segmentFromBounds(left, right, segmentBottom, bottom),
    segmentFromBounds(left, right, top, segmentTop),
  ].filter((piece): piece is WallSolidSegment => piece !== undefined);
}

/**
 * Subtracts each opening rectangle from the wall face. The remaining pieces
 * never overlap an opening, so extruding every piece through the full wall
 * thickness leaves a true void on both the interior and exterior faces.
 */
export function createWallSolidSegments(
  length: number,
  height: number,
  openings: readonly WallOpeningRect[],
): WallSolidSegment[] {
  if (!finite(length) || !finite(height) || length <= epsilon || height <= epsilon) {
    return [];
  }

  return normalizeWallOpeningRects(length, height, openings).reduce<WallSolidSegment[]>(
    (segments, opening) => segments.flatMap((segment) => subtractOpening(segment, opening)),
    [{ x: 0, y: height / 2, width: length, height }],
  );
}
