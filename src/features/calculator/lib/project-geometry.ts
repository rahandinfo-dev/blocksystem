import type {
  CalculatorProjectData,
  NumericOpening,
  NumericUnit,
  OpeningInput,
} from "../types/index.ts";

/**
 * Converts persisted project geometry (stored canonically in metres) into the
 * sole numeric model consumed by calculations and both visual workspaces.
 * Renderers may derive presentation geometry from this data, but never own a
 * second editable wall or opening model.
 */
export function numericOpenings(openings: OpeningInput[]): NumericOpening[] {
  return openings.map((opening) => ({
    id: opening.id,
    width: Number(opening.width),
    height: Number(opening.height),
    quantity: Number(opening.quantity),
    wallId: opening.wallId || undefined,
    horizontalPosition:
      opening.horizontalPosition === "" ? undefined : Number(opening.horizontalPosition),
    sillHeight: opening.sillHeight === "" ? undefined : Number(opening.sillHeight),
  }));
}

/** Shared, non-mutating project geometry for calculation, 2D, 3D and scenarios. */
export function projectNumericUnits(data: CalculatorProjectData): NumericUnit[] {
  if (data.mode === "walls") {
    return data.walls.map((wall, index) => ({
      id: wall.id,
      name: wall.name || `Wall ${index + 1}`,
      kind: "wall" as const,
      length: Number(wall.length),
      height: Number(wall.height),
      doors: numericOpenings(wall.doors).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
      windows: numericOpenings(wall.windows).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
      wallAssignments: [{ id: wall.id, side: "front" as const }],
    }));
  }

  if (data.settings.interfaceMode === "advanced") {
    return data.rooms.flatMap((room, roomIndex) =>
      room.walls.map((wall, wallIndex) => ({
        id: wall.id,
        name: `${room.name || `Room ${roomIndex + 1}`} â€” ${wall.name || `Wall ${wallIndex + 1}`}`,
        kind: "wall" as const,
        length: Number(wallIndex % 2 === 0 ? room.length : room.width),
        height: Number(room.height),
        doors: numericOpenings(wall.doors).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
        windows: numericOpenings(wall.windows).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
        otherOpenings: numericOpenings(wall.otherOpenings).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
        structuralDeductions: numericOpenings(wall.structuralDeductions).map((opening) => ({ ...opening, wallId: opening.wallId ?? wall.id })),
        enabled: wall.enabled,
        wallType: wall.wallType,
        wallAssignments: [{ id: wall.id, side: "front" as const }],
      })),
    );
  }

  return data.rooms.map((room, index) => ({
    id: room.id,
    name: room.name || `Room ${index + 1}`,
    kind: "room" as const,
    length: Number(room.length),
    width: Number(room.width),
    height: Number(room.height),
    doors: numericOpenings(room.doors),
    windows: numericOpenings(room.windows),
    wallAssignments: room.walls.map((wall, wallIndex) => ({
      id: wall.id,
      side: (["front", "right", "back", "left"] as const)[wallIndex % 4],
    })),
  }));
}
