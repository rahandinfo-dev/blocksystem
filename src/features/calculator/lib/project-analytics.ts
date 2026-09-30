import { blockDefinitions } from "../config/blocks.ts";
import { calculateProject } from "./calculations.ts";
import { projectNumericUnits } from "./scenario-engine.ts";
import type { CalculatorProjectData, CalculationResult, SavedProject } from "../types/index.ts";

export type ProjectHealth = "complete" | "needs-information" | "invalid-measurement";
export type AnalyticsProject = { project: SavedProject; result?: CalculationResult; health: ProjectHealth; blockLabel: string; scenarioCount: number };
export type DashboardFilters = { status: "all" | CalculatorProjectData["metadata"]["status"]; query: string; range: "all" | "week" | "month" | "year" };
export type DashboardAnalytics = {
  projects: AnalyticsProject[]; statusCounts: Record<CalculatorProjectData["metadata"]["status"], number>;
  rooms: number; walls: number; grossArea: number; openingArea: number; netArea: number;
  materials: Array<{ label: string; base: number; waste: number; final: number }>;
  costs: Array<{ currency: "IQD" | "USD"; material: number; waste: number; labour: number; transport: number; additional: number; total: number }>;
  scenarios: number; health: Record<ProjectHealth, number>;
};

function blockFor(data: CalculatorProjectData) {
  return data.settings.blockMode === "custom"
    ? { id: "custom" as const, name: "Custom block", ...data.settings.customBlock }
    : blockDefinitions.find((block) => block.id === data.settings.selectedBlockId) ?? blockDefinitions[1];
}

export function calculateSavedProject(data: CalculatorProjectData) {
  const waste = data.settings.wastePreset === "custom" ? Number(data.settings.customWastePercentage) : Number(data.settings.wastePreset);
  return calculateProject({ mode: data.mode, units: projectNumericUnits(data), block: blockFor(data), wastePercentage: waste,
    unitPrice: data.settings.unitPrice === "" ? undefined : Number(data.settings.unitPrice), currency: data.settings.currency,
    costExtras: { transportCost: Number(data.settings.transportCost || 0), laborCost: Number(data.settings.laborCost || 0), mortarCost: Number(data.settings.mortarCost || 0), otherCost: Number(data.settings.otherCost || 0), otherCostLabel: data.settings.otherCostLabel || undefined },
  });
}

export function projectHealth(data: CalculatorProjectData): ProjectHealth {
  if (!data.metadata.projectName.trim() || (data.mode === "rooms" ? data.rooms.length === 0 : data.walls.length === 0)) return "needs-information";
  return calculateSavedProject(data).isValid ? "complete" : "invalid-measurement";
}

function inRange(date: string, range: DashboardFilters["range"], now: Date) {
  if (range === "all") return true;
  const value = new Date(date).getTime(); if (!Number.isFinite(value)) return false;
  const days = range === "week" ? 7 : range === "month" ? 31 : 366;
  return value >= now.getTime() - days * 86_400_000 && value <= now.getTime();
}

/** Pure dashboard aggregation: only saved project state and calculateProject outputs enter here. */
export function aggregateProjectAnalytics(projects: SavedProject[], filters: DashboardFilters, now = new Date()): DashboardAnalytics {
  const statusCounts = { draft: 0, active: 0, completed: 0, archived: 0 };
  const health = { complete: 0, "needs-information": 0, "invalid-measurement": 0 };
  const materialMap = new Map<string, { label: string; base: number; waste: number; final: number }>();
  const costMap = new Map<"IQD" | "USD", { currency: "IQD" | "USD"; material: number; waste: number; labour: number; transport: number; additional: number; total: number }>();
  const normalized = filters.query.trim().toLocaleLowerCase();
  const visible = projects.filter((project) => (filters.status === "all" || project.data.metadata.status === filters.status) && inRange(project.savedAt, filters.range, now) && (!normalized || `${project.name} ${project.data.metadata.clientName} ${project.data.metadata.ownerName} ${project.data.metadata.location}`.toLocaleLowerCase().includes(normalized)));
  let rooms = 0; let walls = 0; let grossArea = 0; let openingArea = 0; let netArea = 0; let scenarios = 0;
  const rows: AnalyticsProject[] = visible.map((project) => {
    const data = project.data; const healthState = projectHealth(data); const response = calculateSavedProject(data); const result = response.isValid ? response.result : undefined; const block = blockFor(data); const blockLabel = `${block.name} (${block.thicknessCm} cm)`;
    statusCounts[data.metadata.status] += 1; health[healthState] += 1; rooms += data.rooms.length; walls += data.mode === "walls" ? data.walls.length : data.settings.interfaceMode === "advanced" ? data.rooms.reduce((sum, room) => sum + room.walls.length, 0) : data.rooms.length * 4; scenarios += data.scenarioComparison?.scenarios.length ?? 0;
    if (result) { grossArea += result.grossWallArea; openingArea += result.totalOpeningArea + result.totalStructuralDeductionArea; netArea += result.netWallArea;
      const material = materialMap.get(blockLabel) ?? { label: blockLabel, base: 0, waste: 0, final: 0 }; material.base += result.requiredBlocks; material.waste += result.wasteBlocks; material.final += result.recommendedBlocks; materialMap.set(blockLabel, material);
      if (result.cost) { const current = costMap.get(result.cost.currency) ?? { currency: result.cost.currency, material: 0, waste: 0, labour: 0, transport: 0, additional: 0, total: 0 }; current.material += result.cost.baseBlockCost; current.waste += result.cost.wasteCost; current.labour += result.cost.laborCost; current.transport += result.cost.transportCost; current.additional += result.cost.mortarCost + result.cost.otherCost; current.total += result.cost.grandTotal; costMap.set(result.cost.currency, current); }
    }
    return { project, result, health: healthState, blockLabel, scenarioCount: data.scenarioComparison?.scenarios.length ?? 0 };
  });
  return { projects: rows, statusCounts, rooms, walls, grossArea, openingArea, netArea, materials: [...materialMap.values()], costs: [...costMap.values()], scenarios, health };
}
