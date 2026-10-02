import { calculateProject } from "./calculations.ts";
import type {
  BlockDefinition,
  CalculationMode,
  CalculationResult,
  CalculatorProjectData,
  NumericOpening,
  NumericUnit,
  OpeningInput,
  RoomInput,
  RoomWallInput,
  WallInput,
} from "../types/index.ts";
import { convertLength, type LengthUnit } from "../../../lib/units.ts";

/**
 * A receipt deliberately has one scope.  The calculator can contain many
 * rooms or walls, but a receipt must never silently include unrelated units.
 */
export interface ReceiptScopeOption {
  id: string;
  kind: "room" | "wall";
  label: string;
}

export interface ReceiptDimension {
  label: string;
  value: string;
}

export interface ReceiptOpening {
  id: string;
  type: "door" | "window";
  label: string;
  dimensions: string;
  quantity: number;
  area: number;
  wallLabel?: string;
}

export interface ReceiptCostData {
  currency: "IQD" | "USD";
  unitPrice: number;
  baseBlockCost: number;
  wasteCost: number;
  recommendedTotalCost: number;
  transportCost: number;
  laborCost: number;
  mortarCost: number;
  otherCost: number;
  otherCostLabel?: string;
  grandTotal: number;
}

/** Normalized, calculation-engine-backed data consumed by the PDF renderer. */
export interface ReceiptData {
  reference: string;
  generatedAt: string;
  fileName: string;
  scope: ReceiptScopeOption;
  projectName?: string;
  ownerName?: string;
  location?: string;
  dimensions: ReceiptDimension[];
  block: {
    name: string;
    faceDimensions: string;
    thickness: string;
  };
  doors: ReceiptOpening[];
  windows: ReceiptOpening[];
  result: CalculationResult;
  cost?: ReceiptCostData;
  mortar?: { estimatedVolumeM3: number; consumptionM3PerM2: number };
}

export interface BuildReceiptOptions {
  scopeId: string;
  generatedAt?: Date;
  reference?: string;
}

interface ScopeSource {
  option: ReceiptScopeOption;
  calculationMode: CalculationMode;
  units: NumericUnit[];
  dimensions: ReceiptDimension[];
  doors: ReceiptOpening[];
  windows: ReceiptOpening[];
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatInputLength(value: string, unit: LengthUnit): string {
  const numericValue = convertLength(Number(value), "m", unit);
  return `${formatNumber(numericValue)} ${unit}`;
}

function numericOpenings(openings: OpeningInput[]): NumericOpening[] {
  return openings.map((opening) => ({
    width: Number(opening.width),
    height: Number(opening.height),
    quantity: Number(opening.quantity),
  }));
}

function openingRows(
  openings: OpeningInput[],
  type: "door" | "window",
  wallLabel?: string,
): ReceiptOpening[] {
  const defaultLabel = type === "door" ? "دەرگا" : "پەنجەرە";

  return openings
    .map((opening, index) => {
      const width = Number(opening.width);
      const height = Number(opening.height);
      const quantity = Number(opening.quantity);

      return {
        id: opening.id,
        type,
        label: opening.name.trim() || `${defaultLabel} ${index + 1}`,
        dimensions: `${formatInputLength(opening.width, opening.widthUnit)} × ${formatInputLength(opening.height, opening.heightUnit)}`,
        quantity,
        area: width * height * quantity,
        wallLabel,
      };
    })
    .filter(
      (opening) =>
        Number.isFinite(opening.area) &&
        opening.area > 0 &&
        Number.isInteger(opening.quantity) &&
        opening.quantity > 0,
    );
}

function roomLabel(room: RoomInput, index: number): string {
  return room.name.trim() || `ژووری ${index + 1}`;
}

function wallLabel(wall: WallInput | RoomWallInput, index: number): string {
  return wall.name.trim() || `دیوار ${index + 1}`;
}

function getQuickRoomScope(room: RoomInput, index: number): ScopeSource {
  const label = roomLabel(room, index);
  const option: ReceiptScopeOption = { id: `room:${room.id}`, kind: "room", label };

  return {
    option,
    calculationMode: "rooms",
    units: [
      {
        id: room.id,
        name: label,
        kind: "room",
        length: Number(room.length),
        width: Number(room.width),
        height: Number(room.height),
        doors: numericOpenings(room.doors),
        windows: numericOpenings(room.windows),
      },
    ],
    dimensions: [
      { label: "درێژی", value: formatInputLength(room.length, room.lengthUnit) },
      { label: "پانی", value: formatInputLength(room.width, room.widthUnit) },
      { label: "بەرزی", value: formatInputLength(room.height, room.heightUnit) },
    ],
    doors: openingRows(room.doors, "door"),
    windows: openingRows(room.windows, "window"),
  };
}

function getAdvancedRoomScope(room: RoomInput, roomIndex: number): ScopeSource {
  const label = roomLabel(room, roomIndex);
  const option: ReceiptScopeOption = { id: `room:${room.id}`, kind: "room", label };
  const doors: ReceiptOpening[] = [];
  const windows: ReceiptOpening[] = [];

  const units = room.walls.map((wall, wallIndex) => {
    const isLengthWall = wallIndex % 2 === 0;
    const lengthValue = isLengthWall ? room.length : room.width;
    const wallName = wallLabel(wall, wallIndex);
    doors.push(...openingRows(wall.doors, "door", wallName));
    windows.push(...openingRows(wall.windows, "window", wallName));

    return {
      id: wall.id,
      name: wallName,
      kind: "wall" as const,
      length: Number(lengthValue),
      height: Number(room.height),
      doors: numericOpenings(wall.doors),
      windows: numericOpenings(wall.windows),
      otherOpenings: numericOpenings(wall.otherOpenings),
      structuralDeductions: numericOpenings(wall.structuralDeductions),
      enabled: wall.enabled,
      wallType: wall.wallType,
    };
  });

  return {
    option,
    calculationMode: "walls",
    units,
    dimensions: [
      { label: "درێژی ژوور", value: formatInputLength(room.length, room.lengthUnit) },
      { label: "پانی ژوور", value: formatInputLength(room.width, room.widthUnit) },
      { label: "بەرزی دیوار", value: formatInputLength(room.height, room.heightUnit) },
    ],
    doors,
    windows,
  };
}

function getWallScope(wall: WallInput, index: number): ScopeSource {
  const label = wallLabel(wall, index);
  const option: ReceiptScopeOption = { id: `wall:${wall.id}`, kind: "wall", label };

  return {
    option,
    calculationMode: "walls",
    units: [
      {
        id: wall.id,
        name: label,
        kind: "wall",
        length: Number(wall.length),
        height: Number(wall.height),
        doors: numericOpenings(wall.doors),
        windows: numericOpenings(wall.windows),
      },
    ],
    dimensions: [
      { label: "درێژی دیوار", value: formatInputLength(wall.length, wall.lengthUnit) },
      { label: "بەرزی دیوار", value: formatInputLength(wall.height, wall.heightUnit) },
    ],
    doors: openingRows(wall.doors, "door"),
    windows: openingRows(wall.windows, "window"),
  };
}

function getScopeSources(data: CalculatorProjectData): ScopeSource[] {
  if (data.mode === "walls") {
    return data.walls.map(getWallScope);
  }

  return data.rooms.map((room, index) =>
    data.settings.interfaceMode === "advanced"
      ? getAdvancedRoomScope(room, index)
      : getQuickRoomScope(room, index),
  );
}

export function getReceiptScopes(data: CalculatorProjectData): ReceiptScopeOption[] {
  return getScopeSources(data).map((source) => source.option);
}

function calculateScope(
  data: CalculatorProjectData,
  block: BlockDefinition,
  scope: ScopeSource,
): CalculationResult {
  const wastePercentage =
    data.settings.wastePreset === "custom"
      ? Number(data.settings.customWastePercentage)
      : Number(data.settings.wastePreset);
  const response = calculateProject({
    mode: scope.calculationMode,
    units: scope.units,
    block,
    wastePercentage,
    unitPrice:
      data.settings.unitPrice === "" ? undefined : Number(data.settings.unitPrice),
    currency: data.settings.currency,
    exchangeRateIqdPerUsd:
      data.settings.exchangeRateIqdPerUsd === ""
        ? undefined
        : Number(data.settings.exchangeRateIqdPerUsd),
    mortarConsumptionM3PerM2: data.settings.mortarEnabled
      ? Number(data.settings.mortarConsumptionM3PerM2)
      : undefined,
    mortarJointThicknessCm: data.settings.mortarJointEnabled
      ? Number(data.settings.mortarJointThicknessCm)
      : 0,
    costExtras: {
      transportCost: Number(data.settings.transportCost || 0),
      laborCost: Number(data.settings.laborCost || 0),
      mortarCost: Number(data.settings.mortarCost || 0),
      otherCost: Number(data.settings.otherCost || 0),
      otherCostLabel: data.settings.otherCostLabel || undefined,
    },
  });

  if (!response.isValid) {
    throw new Error("ئەنجامی ئەم بەشە بۆ دروستکردنی پسووڵە ئامادە نییە.");
  }

  return response.result;
}

export function createReceiptReference(date: Date, sequence = 1): string {
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("");
  return `REK-${datePart}-${String(Math.max(1, sequence)).padStart(3, "0")}`;
}

export function createReceiptFileName(
  scope: ReceiptScopeOption,
  date: Date,
  projectName?: string,
): string {
  const type = scope.kind === "room" ? "Room" : "Wall";
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");
  const safeProjectName = (projectName ?? "")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return safeProjectName
    ? `BlockSystem-${safeProjectName}-${datePart}.pdf`
    : `BlockSystem-${type}-${datePart}.pdf`;
}

/**
 * Builds a receipt from one selected authoritative unit and delegates all
 * quantities, waste, and pricing to the application's calculation engine.
 */
export function buildReceiptData(
  data: CalculatorProjectData,
  block: BlockDefinition,
  options: BuildReceiptOptions,
): ReceiptData {
  const scope = getScopeSources(data).find(
    (candidate) => candidate.option.id === options.scopeId,
  );
  if (!scope) throw new Error("بەشی هەڵبژێردراو نەدۆزرایەوە.");

  const generatedAt = options.generatedAt ?? new Date();
  const result = calculateScope(data, block, scope);
  const cost = result.cost
    ? {
        currency: result.cost.currency,
        unitPrice: result.cost.unitPrice,
        baseBlockCost: result.cost.baseBlockCost,
        wasteCost: result.cost.wasteCost,
        recommendedTotalCost: result.cost.recommendedTotalCost,
        transportCost: result.cost.transportCost,
        laborCost: result.cost.laborCost,
        mortarCost: result.cost.mortarCost,
        otherCost: result.cost.otherCost,
        otherCostLabel: result.cost.otherCostLabel,
        grandTotal: result.cost.grandTotal,
      }
    : undefined;

  return {
    reference: options.reference ?? createReceiptReference(generatedAt),
    generatedAt: generatedAt.toISOString(),
    fileName: createReceiptFileName(scope.option, generatedAt, data.metadata.projectName),
    scope: scope.option,
    projectName: data.metadata.projectName.trim() || undefined,
    ownerName: data.metadata.ownerName.trim() || undefined,
    location: data.metadata.location.trim() || undefined,
    dimensions: scope.dimensions,
    block: {
      name: block.name,
      faceDimensions: `${formatNumber(block.lengthCm)} × ${formatNumber(block.heightCm)} cm`,
      thickness: `${formatNumber(block.thicknessCm)} cm`,
    },
    doors: scope.doors,
    windows: scope.windows,
    result,
    cost,
    mortar: result.mortar,
  };
}
