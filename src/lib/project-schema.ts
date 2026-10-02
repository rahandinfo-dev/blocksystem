import type {
  CalculatorProjectData,
  OpeningInput,
  RoomInput,
  RoomWallInput,
  SavedProject,
  WallInput,
} from "@/features/calculator/types";

export const projectSchemaVersion = 6 as const;
export const calculationEngineVersion = "2.2.0";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function validId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(value);
}
function lengthUnit(value: unknown): "mm" | "cm" | "m" | "in" | "ft" {
  return value === "mm" || value === "cm" || value === "in" || value === "ft"
    ? value
    : "m";
}
function asOpenings(value: unknown, fallbackWallId = ""): OpeningInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((opening, index) => ({
      id: asText(opening.id) || `migrated-opening-${index}`,
      name: asText(opening.name),
      width: asText(opening.width),
      height: asText(opening.height),
      quantity: asText(opening.quantity) || "1",
      widthUnit: lengthUnit(opening.widthUnit),
      heightUnit: lengthUnit(opening.heightUnit),
      wallId: asText(opening.wallId) || fallbackWallId,
      horizontalPosition: asText(opening.horizontalPosition),
      horizontalPositionUnit: lengthUnit(opening.horizontalPositionUnit),
      sillHeight: asText(opening.sillHeight) || "0",
      sillHeightUnit: lengthUnit(opening.sillHeightUnit),
    }));
}
function defaultWalls(roomId: string): RoomWallInput[] {
  return [1, 2, 3, 4].map((number) => ({
    id: `${roomId}-wall-${number}`,
    name: `دیوار ${number}`,
    enabled: true,
    wallType: "interior",
    doors: [],
    windows: [],
    otherOpenings: [],
    structuralDeductions: [],
  }));
}
function asRooms(value: unknown): RoomInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((room, index) => {
    const id = asText(room.id) || `migrated-room-${index}`;
    const rawWalls = Array.isArray(room.walls)
      ? room.walls.filter(isRecord)
      : [];
    const walls = rawWalls.length
      ? rawWalls.map((wall, wallIndex) => {
          const wallId = asText(wall.id) || `${id}-wall-${wallIndex + 1}`;
          return {
            id: wallId,
            name: asText(wall.name) || `دیوار ${wallIndex + 1}`,
            enabled: wall.enabled !== false,
            wallType:
              wall.wallType === "exterior"
                ? ("exterior" as const)
                : ("interior" as const),
            doors: asOpenings(wall.doors, wallId),
            windows: asOpenings(wall.windows, wallId),
            otherOpenings: asOpenings(wall.otherOpenings, wallId),
            structuralDeductions: asOpenings(wall.structuralDeductions, wallId),
          };
        })
      : defaultWalls(id);
    const defaultWallId = walls[0]?.id ?? "";
    return {
      id,
      name: asText(room.name),
      length: asText(room.length),
      width: asText(room.width),
      height: asText(room.height),
      lengthUnit: lengthUnit(room.lengthUnit),
      widthUnit: lengthUnit(room.widthUnit),
      heightUnit: lengthUnit(room.heightUnit),
      doors: asOpenings(room.doors, defaultWallId),
      windows: asOpenings(room.windows, defaultWallId),
      walls,
    };
  });
}
function asWalls(value: unknown): WallInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((wall, index) => {
    const id = asText(wall.id) || `migrated-wall-${index}`;
    return {
      id,
      name: asText(wall.name),
      length: asText(wall.length),
      height: asText(wall.height),
      thickness: asText(wall.thickness) || "0.2",
      lengthUnit: lengthUnit(wall.lengthUnit),
      heightUnit: lengthUnit(wall.heightUnit),
      thicknessUnit: lengthUnit(wall.thicknessUnit),
      wallType: wall.wallType === "exterior" ? "exterior" : "interior",
      notes: asText(wall.notes),
      doors: asOpenings(wall.doors, id),
      windows: asOpenings(wall.windows, id),
    };
  });
}
function asScenarioComparison(
  value: unknown,
): CalculatorProjectData["scenarioComparison"] {
  if (!isRecord(value) || !Array.isArray(value.scenarios)) return undefined;
  const scenarios = value.scenarios
    .filter(isRecord)
    .map((scenario, index) => ({
      id: asText(scenario.id) || `migrated-scenario-${index}`,
      name: asText(scenario.name) || `Scenario ${index + 1}`,
      blockMode:
        scenario.blockMode === "custom"
          ? ("custom" as const)
          : ("library" as const),
      selectedBlockId: (scenario.selectedBlockId === "10cm" ||
      scenario.selectedBlockId === "30cm"
        ? scenario.selectedBlockId
        : "20cm") as "10cm" | "20cm" | "30cm",
      customBlock: isRecord(scenario.customBlock)
        ? {
            thicknessCm: Number(scenario.customBlock.thicknessCm) || 20,
            lengthCm: Number(scenario.customBlock.lengthCm) || 40,
            heightCm: Number(scenario.customBlock.heightCm) || 20,
          }
        : { thicknessCm: 20, lengthCm: 40, heightCm: 20 },
      wastePercentage: asText(scenario.wastePercentage) || "0",
      unitPrice: asText(scenario.unitPrice).replace(/,/g, ""),
      currency:
        scenario.currency === "USD" ? ("USD" as const) : ("IQD" as const),
      transportCost: asText(scenario.transportCost).replace(/,/g, ""),
      laborCost: asText(scenario.laborCost).replace(/,/g, ""),
      mortarCost: asText(scenario.mortarCost).replace(/,/g, ""),
      otherCostLabel: asText(scenario.otherCostLabel),
      otherCost: asText(scenario.otherCost).replace(/,/g, ""),
      notes: asText(scenario.notes),
      createdAt: asText(scenario.createdAt),
      updatedAt: asText(scenario.updatedAt),
    }));
  const has = (id: unknown) =>
    typeof id === "string" && scenarios.some((scenario) => scenario.id === id);
  return {
    scenarios,
    baselineScenarioId: has(value.baselineScenarioId)
      ? (value.baselineScenarioId as string)
      : undefined,
    activeScenarioId: has(value.activeScenarioId)
      ? (value.activeScenarioId as string)
      : undefined,
  };
}

/** Historical values had no unit metadata and were definitively entered in metres. */
export function migrateSavedProject(value: unknown): SavedProject | null {
  if (!isRecord(value) || !isRecord(value.data) || !validId(value.id))
    return null;
  const data = value.data;
  const settings = isRecord(data.settings) ? data.settings : {};
  const normalized: CalculatorProjectData = {
    mode: data.mode === "walls" ? "walls" : "rooms",
    metadata: isRecord(data.metadata)
      ? {
          projectName: asText(data.metadata.projectName),
          projectNumber: asText(data.metadata.projectNumber),
          ownerName: asText(data.metadata.ownerName),
          clientName: asText(data.metadata.clientName),
          location: asText(data.metadata.location),
          description: asText(data.metadata.description),
          status:
            data.metadata.status === "active" ||
            data.metadata.status === "completed" ||
            data.metadata.status === "archived"
              ? data.metadata.status
              : "draft",
          measurementSystem:
            data.metadata.measurementSystem === "imperial"
              ? "imperial"
              : "metric",
          notes: asText(data.metadata.notes),
        }
      : {
          projectName: "",
          projectNumber: "",
          ownerName: "",
          clientName: "",
          location: "",
          description: "",
          status: "draft",
          measurementSystem: "metric",
          notes: "",
        },
    rooms: asRooms(data.rooms),
    walls: asWalls(data.walls),
    settings: {
      blockMode: settings.blockMode === "custom" ? "custom" : "library",
      selectedBlockId:
        settings.selectedBlockId === "10cm" ||
        settings.selectedBlockId === "30cm"
          ? settings.selectedBlockId
          : "20cm",
      customBlock: isRecord(settings.customBlock)
        ? {
            thicknessCm: Number(settings.customBlock.thicknessCm) || 20,
            lengthCm: Number(settings.customBlock.lengthCm) || 40,
            heightCm: Number(settings.customBlock.heightCm) || 20,
          }
        : { thicknessCm: 20, lengthCm: 40, heightCm: 20 },
      customBlockUnit:
        lengthUnit(settings.customBlockUnit) === "m"
          ? "cm"
          : lengthUnit(settings.customBlockUnit),
      mortarJointUnit:
        lengthUnit(settings.mortarJointUnit) === "m"
          ? "cm"
          : lengthUnit(settings.mortarJointUnit),
      areaDisplayUnit:
        settings.areaDisplayUnit === "cm²" ||
        settings.areaDisplayUnit === "mm²" ||
        settings.areaDisplayUnit === "in²" ||
        settings.areaDisplayUnit === "ft²"
          ? settings.areaDisplayUnit
          : "m²",
      volumeDisplayUnit:
        settings.volumeDisplayUnit === "cm³" ||
        settings.volumeDisplayUnit === "mm³"
          ? settings.volumeDisplayUnit
          : "m³",
      wastePreset:
        settings.wastePreset === "0" ||
        settings.wastePreset === "3" ||
        settings.wastePreset === "5" ||
        settings.wastePreset === "7" ||
        settings.wastePreset === "10" ||
        settings.wastePreset === "15" ||
        settings.wastePreset === "custom"
          ? settings.wastePreset
          : "5",
      customWastePercentage: asText(settings.customWastePercentage),
      unitPrice: asText(settings.unitPrice).replace(/,/g, ""),
      currency: settings.currency === "USD" ? "USD" : "IQD",
      exchangeRateIqdPerUsd: asText(settings.exchangeRateIqdPerUsd).replace(
        /,/g,
        "",
      ),
      exchangeRateSource: asText(settings.exchangeRateSource),
      exchangeRateUpdatedAt: asText(settings.exchangeRateUpdatedAt),
      mortarEnabled: settings.mortarEnabled === true,
      mortarConsumptionM3PerM2: asText(settings.mortarConsumptionM3PerM2),
      cementRatio: asText(settings.cementRatio),
      interfaceMode:
        settings.interfaceMode === "advanced" ? "advanced" : "quick",
      mortarJointEnabled: settings.mortarJointEnabled === true,
      mortarJointThicknessCm: asText(settings.mortarJointThicknessCm),
      transportCost: asText(settings.transportCost).replace(/,/g, ""),
      laborCost: asText(settings.laborCost).replace(/,/g, ""),
      mortarCost: asText(settings.mortarCost).replace(/,/g, ""),
      otherCostLabel: asText(settings.otherCostLabel),
      otherCost: asText(settings.otherCost).replace(/,/g, ""),
    },
    scenarioComparison: asScenarioComparison(data.scenarioComparison),
  };
  const ids = new Set<string>();
  const collect = (id: string) => !ids.has(id) && ids.add(id);
  if (
    !normalized.rooms.every(
      (room) =>
        collect(room.id) && room.walls.every((wall) => collect(wall.id)),
    ) ||
    !normalized.walls.every((wall) => collect(wall.id))
  )
    return null;
  for (const room of normalized.rooms) {
    const wallIds = new Set(room.walls.map((wall) => wall.id));
    const openings = [
      ...room.doors,
      ...room.windows,
      ...room.walls.flatMap((wall) => [
        ...wall.doors,
        ...wall.windows,
        ...wall.otherOpenings,
        ...wall.structuralDeductions,
      ]),
    ];
    if (
      !openings.every(
        (opening) =>
          collect(opening.id) &&
          (!opening.wallId || wallIds.has(opening.wallId)),
      )
    )
      return null;
  }
  if (
    !normalized.walls.every((wall) =>
      [...wall.doors, ...wall.windows].every((opening) => collect(opening.id)),
    )
  )
    return null;
  if (
    normalized.scenarioComparison &&
    !normalized.scenarioComparison.scenarios.every((scenario) =>
      collect(scenario.id),
    )
  )
    return null;
  return {
    version: projectSchemaVersion,
    id: value.id as string,
    name:
      asText(value.name) || normalized.metadata.projectName || "پرۆژەی بێ ناو",
    createdAt:
      asText(value.createdAt) ||
      asText(value.savedAt) ||
      new Date(0).toISOString(),
    savedAt: asText(value.savedAt) || new Date(0).toISOString(),
    data: normalized,
    calculationEngineVersion,
  };
}
