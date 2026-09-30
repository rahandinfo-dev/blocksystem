export type CalculationMode = "rooms" | "walls";

export type BlockId = "10cm" | "20cm" | "30cm" | "custom";

export type WastePreset = "0" | "3" | "5" | "7" | "10" | "custom";

import type { CurrencyCode } from "@/lib/currency";
import type { AreaUnit, LengthUnit, VolumeUnit } from "@/lib/units";

export interface BlockDefinition {
  id: BlockId;
  name: string;
  thicknessCm: number;
  lengthCm: number;
  heightCm: number;
}

export interface OpeningInput {
  id: string;
  name: string;
  width: string;
  height: string;
  quantity: string;
  widthUnit: LengthUnit;
  heightUnit: LengthUnit;
  /**
   * The owning room-wall when an opening belongs to a rectangular room.
   * Standalone walls and legacy records may leave this empty; those render on
   * their only/front wall.
   */
  wallId: string;
  /** Left edge offset along the wall, stored canonically in metres. */
  horizontalPosition: string;
  horizontalPositionUnit: LengthUnit;
  /** Bottom/sill height above the finished floor, stored canonically in metres. */
  sillHeight: string;
  sillHeightUnit: LengthUnit;
}

export type WallType = "interior" | "exterior";

export interface RoomWallInput {
  id: string;
  name: string;
  enabled: boolean;
  wallType: WallType;
  thickness?: string;
  thicknessUnit?: LengthUnit;
  notes?: string;
  doors: OpeningInput[];
  windows: OpeningInput[];
  otherOpenings: OpeningInput[];
  structuralDeductions: OpeningInput[];
}

export interface NumericOpening {
  id?: string;
  width: number;
  height: number;
  quantity: number;
  wallId?: string;
  /** Left edge offset from the beginning of the assigned wall, in metres. */
  horizontalPosition?: number;
  /** Bottom edge height above floor, in metres. */
  sillHeight?: number;
}

export type RoomWallSide = "front" | "back" | "right" | "left";

export interface NumericWallAssignment {
  id: string;
  side: RoomWallSide;
}

export interface RoomInput {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  lengthUnit: LengthUnit;
  widthUnit: LengthUnit;
  heightUnit: LengthUnit;
  doors: OpeningInput[];
  windows: OpeningInput[];
  walls: RoomWallInput[];
}

export interface WallInput {
  id: string;
  name: string;
  length: string;
  height: string;
  thickness?: string;
  thicknessUnit?: LengthUnit;
  wallType?: WallType;
  notes?: string;
  lengthUnit: LengthUnit;
  heightUnit: LengthUnit;
  doors: OpeningInput[];
  windows: OpeningInput[];
}

export interface ProjectMetadata {
  projectName: string;
  projectNumber: string;
  ownerName: string;
  clientName: string;
  location: string;
  description: string;
  status: "draft" | "active" | "completed" | "archived";
  measurementSystem: "metric" | "imperial";
  notes: string;
}

export interface CalculatorSettings {
  blockMode: "library" | "custom";
  selectedBlockId: Exclude<BlockId, "custom">;
  customBlock: Omit<BlockDefinition, "id" | "name">;
  customBlockUnit: LengthUnit;
  mortarJointUnit: LengthUnit;
  areaDisplayUnit: AreaUnit;
  volumeDisplayUnit: VolumeUnit;
  wastePreset: WastePreset;
  customWastePercentage: string;
  unitPrice: string;
  currency: CurrencyCode;
  exchangeRateIqdPerUsd: string;
  exchangeRateSource: string;
  exchangeRateUpdatedAt: string;
  mortarEnabled: boolean;
  mortarConsumptionM3PerM2: string;
  cementRatio: string;
  interfaceMode: "quick" | "advanced";
  mortarJointEnabled: boolean;
  mortarJointThicknessCm: string;
  transportCost: string;
  laborCost: string;
  mortarCost: string;
  otherCostLabel: string;
  otherCost: string;
}

/** A saved material/cost overlay. Geometry always remains on the project. */
export interface ScenarioConfiguration {
  id: string;
  name: string;
  blockMode: "library" | "custom";
  selectedBlockId: Exclude<BlockId, "custom">;
  customBlock: Omit<BlockDefinition, "id" | "name">;
  wastePercentage: string;
  unitPrice: string;
  currency: CurrencyCode;
  transportCost: string;
  laborCost: string;
  mortarCost: string;
  otherCostLabel: string;
  otherCost: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioComparisonData {
  scenarios: ScenarioConfiguration[];
  baselineScenarioId?: string;
  activeScenarioId?: string;
}

export interface CalculatorProjectData {
  mode: CalculationMode;
  metadata: ProjectMetadata;
  rooms: RoomInput[];
  walls: WallInput[];
  settings: CalculatorSettings;
  /** Optional so legacy project records remain valid without migration loss. */
  scenarioComparison?: ScenarioComparisonData;
  identity?: { publicReference: string; verificationToken: string; revoked?: boolean };
}

export interface NumericUnit {
  id: string;
  name: string;
  kind: "room" | "wall";
  length: number;
  width?: number;
  height: number;
  doors: NumericOpening[];
  windows: NumericOpening[];
  otherOpenings?: NumericOpening[];
  structuralDeductions?: NumericOpening[];
  enabled?: boolean;
  wallType?: WallType;
  /** Maps persisted room-wall identifiers to the 3D room sides. */
  wallAssignments?: NumericWallAssignment[];
}

export interface ProjectCalculationInput {
  mode: CalculationMode;
  units: NumericUnit[];
  block: BlockDefinition;
  wastePercentage: number;
  unitPrice?: number;
  currency?: CurrencyCode;
  exchangeRateIqdPerUsd?: number;
  mortarConsumptionM3PerM2?: number;
  mortarJointThicknessCm?: number;
  costExtras?: CostExtras;
}

export interface CostExtras {
  transportCost?: number;
  laborCost?: number;
  mortarCost?: number;
  otherCost?: number;
  otherCostLabel?: string;
}

export interface UnitCalculationResult {
  id: string;
  name: string;
  grossWallArea: number;
  totalDoorArea: number;
  totalWindowArea: number;
  totalOpeningArea: number;
  totalOtherOpeningArea: number;
  totalStructuralDeductionArea: number;
  netWallArea: number;
  estimatedRows: number;
  estimatedBlocksPerRow: number;
  hasCutEstimate: boolean;
}

export interface CalculationResult {
  grossWallArea: number;
  totalDoorArea: number;
  totalWindowArea: number;
  totalOpeningArea: number;
  totalOtherOpeningArea: number;
  totalStructuralDeductionArea: number;
  netWallArea: number;
  blockFaceArea: number;
  rawBlockCount: number;
  requiredBlocks: number;
  wastePercentage: number;
  wasteBlocks: number;
  recommendedBlocks: number;
  units: UnitCalculationResult[];
  cost?: {
    currency: CurrencyCode;
    exchangeRateIqdPerUsd?: number;
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
  };
  mortar?: {
    consumptionM3PerM2: number;
    estimatedVolumeM3: number;
  };
}

export type CalculationErrorCode =
  | "invalid-room"
  | "invalid-wall"
  | "invalid-opening"
  | "openings-too-large"
  | "invalid-block"
  | "invalid-waste"
  | "invalid-price"
  | "invalid-mortar";

export type CalculationResponse =
  | { isValid: true; result: CalculationResult }
  | { isValid: false; error: CalculationErrorCode };

export interface SavedProject {
  version: 1 | 2 | 3 | 4 | 5;
  id: string;
  name: string;
  createdAt?: string;
  savedAt: string;
  data: CalculatorProjectData;
  calculationEngineVersion?: string;
}

export type SaveKind = "manual" | "autosave" | "restore-safety" | "restore";

export interface ProjectVersion {
  id: string;
  projectId: string;
  revision: number;
  savedAt: string;
  saveKind: SaveKind;
  data: CalculatorProjectData;
}

export interface WorkspaceNotification {
  id: string;
  createdAt: string;
  title: string;
  detail?: string;
  level: "success" | "error" | "info";
  read: boolean;
  persistent: boolean;
}

export interface WorkspaceActivity {
  id: string;
  createdAt: string;
  type: "saved" | "restored" | "opened" | "created";
  projectId?: string;
  projectName: string;
  detail?: string;
}

export interface WorkspacePreferences {
  autosave: boolean;
  quickActions: Array<"new" | "save" | "search" | "favorites">;
}
