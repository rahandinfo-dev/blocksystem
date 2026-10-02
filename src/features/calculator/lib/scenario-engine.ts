import { blockDefinitions } from "../config/blocks.ts";
import { calculateProject } from "./calculations.ts";
import { projectNumericUnits } from "./project-geometry.ts";
import type {
  BlockDefinition,
  CalculatorProjectData,
  CalculationResponse,
  ScenarioConfiguration,
} from "../types/index.ts";

export { projectNumericUnits } from "./project-geometry.ts";

export function scenarioBlock(scenario: ScenarioConfiguration): BlockDefinition | undefined {
  if (scenario.blockMode === "custom") {
    return { id: "custom", name: scenario.name, ...scenario.customBlock };
  }
  return blockDefinitions.find((block) => block.id === scenario.selectedBlockId);
}

/** Scenarios change material/cost overlays only; geometry remains canonical project data. */
export function calculateScenario(
  data: CalculatorProjectData,
  scenario: ScenarioConfiguration,
): CalculationResponse {
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
      transportCost: Number(scenario.transportCost || 0),
      laborCost: Number(scenario.laborCost || 0),
      mortarCost: Number(scenario.mortarCost || 0),
      otherCost: Number(scenario.otherCost || 0),
      otherCostLabel: scenario.otherCostLabel || undefined,
    },
  });
}

export function createScenarioFromProject(
  data: CalculatorProjectData,
  id: string,
  name = "Scenario",
): ScenarioConfiguration {
  const settings = data.settings;
  const waste = settings.wastePreset === "custom"
    ? settings.customWastePercentage
    : settings.wastePreset;
  const now = new Date().toISOString();
  return {
    id,
    name,
    blockMode: settings.blockMode,
    selectedBlockId: settings.selectedBlockId,
    customBlock: { ...settings.customBlock },
    wastePercentage: waste || "0",
    unitPrice: settings.unitPrice,
    currency: settings.currency,
    transportCost: settings.transportCost,
    laborCost: settings.laborCost,
    mortarCost: settings.mortarCost,
    otherCostLabel: settings.otherCostLabel,
    otherCost: settings.otherCost,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function scenarioDelta(value: number, baseline?: number) {
  if (!Number.isFinite(value) || baseline === undefined || !Number.isFinite(baseline)) return undefined;
  return {
    absolute: value - baseline,
    percent: baseline === 0 ? undefined : ((value - baseline) / Math.abs(baseline)) * 100,
  };
}
