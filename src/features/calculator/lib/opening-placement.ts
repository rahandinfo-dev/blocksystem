/**
 * Positional opening values are stored as metres. Keeping the boundary math in
 * one small module lets the form and the WebGL preview apply the exact same
 * physical limits without affecting the area calculation engine.
 */
export interface OpeningPlacementBounds {
  length: number;
  height: number;
}

export interface OpeningIntervalRequest {
  id: string;
  width: number;
  /** Undefined means the opening uses deterministic automatic placement. */
  preferredStart?: number;
}

export interface ResolvedOpeningInterval {
  id: string;
  start: number;
  width: number;
}

const epsilon = 0.000001;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function asStoredNumber(value: number): string {
  return String(Number(value.toPrecision(12)));
}

export function clamp(value: number, minimum: number, maximum: number): number {
  if (!finite(value)) return minimum;
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function maxHorizontalPosition(
  wallLength: number,
  openingWidth: number,
): number {
  if (!finite(wallLength) || !finite(openingWidth)) return 0;
  return Math.max(0, wallLength - Math.max(0, openingWidth));
}

export function maxSillHeight(wallHeight: number, openingHeight: number): number {
  if (!finite(wallHeight) || !finite(openingHeight)) return 0;
  return Math.max(0, wallHeight - Math.max(0, openingHeight));
}

export function isHorizontalPositionValid(
  position: number,
  openingWidth: number,
  wallLength: number,
): boolean {
  if (!finite(position) || !finite(openingWidth) || !finite(wallLength)) {
    return true;
  }
  return position >= -epsilon && position <= maxHorizontalPosition(wallLength, openingWidth) + epsilon;
}

export function isSillHeightValid(
  sillHeight: number,
  openingHeight: number,
  wallHeight: number,
): boolean {
  if (!finite(sillHeight) || !finite(openingHeight) || !finite(wallHeight)) {
    return true;
  }
  return sillHeight >= -epsilon && sillHeight <= maxSillHeight(wallHeight, openingHeight) + epsilon;
}

/**
 * A blank position means "automatic". When a position exists, clamp it to the
 * opening's legal left-edge interval. This makes bad input impossible to
 * persist while preserving unfinished/empty form fields.
 */
export function constrainPosition(
  value: string,
  openingWidth: number,
  wallLength: number,
): string {
  if (value === "") return "";
  const numeric = Number(value);
  if (!finite(numeric)) return "";
  return asStoredNumber(clamp(numeric, 0, maxHorizontalPosition(wallLength, openingWidth)));
}

export function constrainSillHeight(
  value: string,
  openingHeight: number,
  wallHeight: number,
): string {
  if (value === "") return "";
  const numeric = Number(value);
  if (!finite(numeric)) return "";
  return asStoredNumber(clamp(numeric, 0, maxSillHeight(wallHeight, openingHeight)));
}

/** Keep an authored opening physically inside a wall after either one changes. */
export function fitOpeningToBounds<T extends {
  width: string;
  height: string;
  horizontalPosition: string;
  sillHeight: string;
}>(opening: T, bounds: OpeningPlacementBounds): T {
  const width = Number(opening.width);
  const height = Number(opening.height);
  const fittedWidth = finite(width) && bounds.length > 0
    ? Math.min(Math.max(width, 0), bounds.length)
    : width;
  const fittedHeight = finite(height) && bounds.height > 0
    ? Math.min(Math.max(height, 0), bounds.height)
    : height;
  const nextWidth = finite(fittedWidth) ? asStoredNumber(fittedWidth) : opening.width;
  const nextHeight = finite(fittedHeight) ? asStoredNumber(fittedHeight) : opening.height;
  return {
    ...opening,
    width: nextWidth,
    height: nextHeight,
    horizontalPosition: bounds.length > 0
      ? constrainPosition(
          opening.horizontalPosition,
          finite(fittedWidth) ? fittedWidth : 0,
          bounds.length,
        )
      : opening.horizontalPosition,
    sillHeight: bounds.height > 0
      ? constrainSillHeight(
          opening.sillHeight,
          finite(fittedHeight) ? fittedHeight : 0,
          bounds.height,
        )
      : opening.sillHeight,
  };
}

type OccupiedInterval = Pick<ResolvedOpeningInterval, "start" | "width">;

function intervalEnd(interval: OccupiedInterval): number {
  return interval.start + interval.width;
}

function nearestAvailableStart(
  preferredStart: number,
  width: number,
  wallLength: number,
  occupied: OccupiedInterval[],
): number | null {
  const maximum = maxHorizontalPosition(wallLength, width);
  let cursor = 0;
  let best: { start: number; distance: number } | undefined;
  const considerGap = (from: number, to: number) => {
    if (to - from + epsilon < width) return;
    const start = clamp(preferredStart, from, to - width);
    const distance = Math.abs(start - preferredStart);
    if (!best || distance < best.distance - epsilon || (Math.abs(distance - best.distance) <= epsilon && start < best.start)) {
      best = { start, distance };
    }
  };
  for (const interval of occupied) {
    considerGap(cursor, interval.start);
    cursor = Math.max(cursor, intervalEnd(interval));
  }
  considerGap(cursor, wallLength);
  return best ? clamp(best.start, 0, maximum) : null;
}

function insertOccupied(
  occupied: OccupiedInterval[],
  interval: OccupiedInterval,
): void {
  const index = occupied.findIndex((candidate) => candidate.start > interval.start);
  if (index === -1) occupied.push(interval);
  else occupied.splice(index, 0, interval);
}

/**
 * Resolves all opening intervals on one wall. Explicit positions retain their
 * nearest legal space first. If a greedy layout would leave a later opening
 * stranded despite enough total wall capacity, the resolver uses a stable
 * packed order instead, guaranteeing no overlap whenever geometry permits it.
 */
export function resolveOpeningIntervals(
  requests: readonly OpeningIntervalRequest[],
  wallLength: number,
): ResolvedOpeningInterval[] {
  if (!finite(wallLength) || wallLength <= 0) {
    return requests.map((request) => ({ id: request.id, start: 0, width: 0 }));
  }
  const normalized = requests.map((request, index) => {
    const width = finite(request.width)
      ? Math.min(Math.max(request.width, 0), wallLength)
      : 0;
    const automaticStart = maxHorizontalPosition(wallLength, width) * ((index + 1) / (requests.length + 1));
    const preferredStart = finite(request.preferredStart ?? Number.NaN)
      ? clamp(request.preferredStart ?? 0, 0, maxHorizontalPosition(wallLength, width))
      : automaticStart;
    return {
      ...request,
      index,
      width,
      preferredStart,
      explicit: finite(request.preferredStart ?? Number.NaN),
    };
  });
  const priority = [...normalized].sort(
    (left, right) => Number(right.explicit) - Number(left.explicit) || left.index - right.index,
  );
  const occupied: OccupiedInterval[] = [];
  const greedy = new Map<string, ResolvedOpeningInterval>();
  let couldPlaceAll = true;
  for (const request of priority) {
    const start = nearestAvailableStart(request.preferredStart, request.width, wallLength, occupied);
    if (start === null) {
      couldPlaceAll = false;
      break;
    }
    const interval = { id: request.id, start, width: request.width };
    greedy.set(request.id, interval);
    insertOccupied(occupied, interval);
  }
  if (couldPlaceAll) {
    return normalized.map((request) => greedy.get(request.id) as ResolvedOpeningInterval);
  }

  const totalWidth = normalized.reduce((total, request) => total + request.width, 0);
  if (totalWidth <= wallLength + epsilon) {
    const packed = [...normalized].sort(
      (left, right) => left.preferredStart - right.preferredStart || left.index - right.index,
    );
    let cursor = 0;
    const resolved = new Map<string, ResolvedOpeningInterval>();
    for (const request of packed) {
      resolved.set(request.id, { id: request.id, start: cursor, width: request.width });
      cursor += request.width;
    }
    return normalized.map((request) => resolved.get(request.id) as ResolvedOpeningInterval);
  }

  // The wall is genuinely overcrowded. Keep each left edge distinct whenever
  // its legal range has room, rather than stacking all geometry at one point.
  const usedStarts: number[] = [];
  return normalized.map((request, index) => {
    const maximum = maxHorizontalPosition(wallLength, request.width);
    if (maximum <= epsilon) {
      return { id: request.id, width: request.width, start: 0 };
    }
    let start = maximum * ((index + 1) / (normalized.length + 1));
    // Pick a deterministic unused grid point if different widths happened to
    // produce the same fractional coordinate in an overcrowded wall.
    for (let attempt = 0; attempt < 1009; attempt += 1) {
      if (!usedStarts.some((used) => Math.abs(used - start) <= epsilon)) break;
      start = maximum * (((index + 1) * 37 + (attempt + 1) * 101) % 1009) / 1009;
    }
    usedStarts.push(start);
    return { id: request.id, width: request.width, start };
  });
}

/**
 * Produces the persisted first-copy start for each input opening. Automatic
 * openings are intentionally not written back by callers; they keep their
 * blank state while the scene resolves them deterministically.
 */
export function resolveOpeningInputPositions(
  openings: readonly {
    id: string;
    width: string;
    quantity: string;
    horizontalPosition: string;
  }[],
  wallLength: number,
): ReadonlyMap<string, string> {
  const requests: Array<OpeningIntervalRequest & { openingId: string; copyIndex: number }> = [];
  openings.forEach((opening) => {
    const width = Number(opening.width);
    const quantity = Math.max(1, Math.min(20, Math.round(Number(opening.quantity)) || 1));
    const requestedStart = opening.horizontalPosition === "" ? undefined : Number(opening.horizontalPosition);
    for (let copyIndex = 0; copyIndex < quantity; copyIndex += 1) {
      requests.push({
        id: `${opening.id}-${copyIndex}`,
        openingId: opening.id,
        copyIndex,
        width,
        preferredStart:
          requestedStart === undefined
            ? undefined
            : requestedStart + copyIndex * (Math.max(0, width) + 0.12),
      });
    }
  });
  const resolved = resolveOpeningIntervals(requests, wallLength);
  const positions = new Map<string, string>();
  for (const interval of resolved) {
    const request = requests.find((candidate) => candidate.id === interval.id);
    if (request?.copyIndex === 0) positions.set(request.openingId, asStoredNumber(interval.start));
  }
  return positions;
}

/**
 * Writes back only authored (non-automatic) first-copy positions. The returned
 * array remains the single authoritative opening list used by forms, storage,
 * calculations, and the 3D scene.
 */
export function resolveInputOpeningCollisions<T extends {
  id: string;
  width: string;
  quantity: string;
  horizontalPosition: string;
}>(openings: readonly T[], wallLength: number): T[] {
  if (!finite(wallLength) || wallLength <= 0) return [...openings];
  const positions = resolveOpeningInputPositions(openings, wallLength);
  return openings.map((opening) => {
    const position = positions.get(opening.id);
    return opening.horizontalPosition === "" || position === undefined || position === opening.horizontalPosition
      ? opening
      : { ...opening, horizontalPosition: position };
  });
}
