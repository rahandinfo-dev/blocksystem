import { blockDefinitions } from "../config/blocks.ts";
import { calculateProject } from "./calculations.ts";
import type {
  BlockDefinition,
  CalculatorProjectData,
  CalculationResponse,
  NumericOpening,
  NumericUnit,
  OpeningInput,
  ScenarioConfiguration,
} from "../types/index.ts";

function numericOpenings(openings: OpeningInput[]): NumericOpening[] {
  return openings.map((opening) => ({
    id: opening.id,
    width: Number(opening.width),
    height: Number(opening.height),
    quantity: Number(opening.quantity),
    wallId: opening.wallId || undefined,
  }));
}

/** Maps persisted canonical-metre project geometry into the sole calculation engine. */
export function projectNumericUnits(data: CalculatorProjectData): NumericUnit[] {
  if (data.mode === "walls") {
    return data.walls.map((wall, index) => ({
      id: wall.id,
      name: wall.name || `Wall ${index + 1}`,
      kind: "wall" as const,
      length: Number(wall.length), height: Number(wall.height),
      doors: numericOpenings(wall.doors), windows: numericOpenings(wall.windows),
    }));
  }
  if (data.settings.interfaceMode === "advanced") {
    return data.rooms.flatMap((room, roomIndex) => room.walls.map((wall, wallIndex) => ({
      id: wall.id,
      name: `${room.name || `Room ${roomIndex + 1}`} — ${wall.name || `Wall ${wallIndex + 1}`}`,
      kind: "wall" as const,
      length: Number(wallIndex % 2 === 0 ? room.length : room.width), height: Number(room.height),
      doors: numericOpenings(wall.doors), windows: numericOpenings(wall.windows),
      otherOpenings: numericOpenings(wall.otherOpenings),
      structuralDeductions: numericOpenings(wall.structuralDeductions), enabled: wall.enabled,
      wallType: wall.wallType,
    })));
  }
  return data.rooms.map((room, index) => ({
    id: room.id, name: room.name || `Room ${index + 1}`, kind: "room" as const,
    length: Number(room.length), width: Number(room.width), height: Number(room.height),
    doors: numericOpenings(room.doors), windows: numericOpenings(room.windows),
  }));
}

export function scenarioBlock(scenario: ScenarioConfiguration): BlockDefinition | undefined {
  if (scenario.blockMode === "custom") return { id: "custom", name: scenario.name, ...scenario.customBlock };
  return blockDefinitions.find((block) => block.id === scenario.selectedBlockId);
}

/** Scenario calculations deliberately delegate quantity, waste and cost to calculateProject. */
export function calculateScenario(data: CalculatorProjectData, scenario: ScenarioConfiguration): CalculationResponse {
  const block = scenarioBlock(scenario);
  if (!block) return { isValid: false, error: "invalid-block" };
  return calculateProject({
    mode: data.mode,
    units: projectNumericUnits(data),
    block,
    wastePercentage: Number(scenario.wastePercentage),
    unitPrice: scenario.unitPrice === "" ? undefined : Number(scenario.unitPrice),
    currency: scenario.currency,
    costExtras: {
      transportCost: Number(scenario.transportCost || 0), laborCost: Number(scenario.laborCost || 0),
      mortarCost: Number(scenario.mortarCost || 0), otherCost: Number(scenario.otherCost || 0),
      otherCostLabel: scenario.otherCostLabel || undefined,
    },
  });
}

export function createScenarioFromProject(data: CalculatorProjectData, id: string, name = "Scenario"): ScenarioConfiguration {
  const settings = data.settings;
  const waste = settings.wastePreset === "custom" ? settings.customWastePercentage : settings.wastePreset;
  const now = new Date().toISOString();
  return {
    id, name, blockMode: settings.blockMode, selectedBlockId: settings.selectedBlockId,
    customBlock: { ...settings.customBlock }, wastePercentage: waste || "0", unitPrice: settings.unitPrice,
    currency: settings.currency, transportCost: settings.transportCost, laborCost: settings.laborCost,
    mortarCost: settings.mortarCost, otherCostLabel: settings.otherCostLabel, otherCost: settings.otherCost,
    notes: "", createdAt: now, updatedAt: now,
  };
}

export function scenarioDelta(value: number, baseline?: number): { absolute: number; percent?: number } | undefined {
  if (!Number.isFinite(value) || baseline === undefined || !Number.isFinite(baseline)) return undefined;
  return { absolute: value - baseline, percent: baseline === 0 ? undefined : ((value - baseline) / Math.abs(baseline)) * 100 };
}
