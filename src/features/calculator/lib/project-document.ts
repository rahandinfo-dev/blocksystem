import { calculateSavedProject } from "./project-analytics.ts";
import { scenarioBlock, calculateScenario } from "./scenario-engine.ts";
import type {
  CalculatorProjectData,
  CalculationResult,
} from "../types/index.ts";
import { blockDefinitions } from "../config/blocks.ts";

export type DocumentKind = "estimate" | "quotation" | "detailed" | "scenarios";
export type ProjectDocumentOptions = {
  kind: DocumentKind;
  reference: string;
  issuedAt: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  preparedBy?: string;
  issuer?: string;
  contact?: string;
  includeRooms?: boolean;
  includeOpenings?: boolean;
};
export type ProjectDocumentData = {
  issuer?: string;
  contact?: string;
  kind: DocumentKind;
  reference: string;
  issuedAt: string;
  validUntil?: string;
  fileName: string;
  project: {
    name: string;
    reference?: string;
    client?: string;
    location?: string;
    status: string;
    notes?: string;
  };
  result: CalculationResult;
  block: { name: string; specification: string };
  rooms: Array<{ name: string; gross: number; openings: number; net: number }>;
  scenarios: Array<{
    name: string;
    block: string;
    base: number;
    waste: number;
    final: number;
    total?: number;
    currency?: "IQD" | "USD";
    baseline: boolean;
  }>;
  notes?: string;
  terms?: string;
  preparedBy?: string;
};

function safeName(value: string) {
  return (
    value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "Project"
  );
}
/** One document snapshot, entirely derived by the authoritative calculation/scenario engines. */
export function buildProjectDocument(
  data: CalculatorProjectData,
  options: ProjectDocumentOptions,
): ProjectDocumentData {
  const response = calculateSavedProject(data);
  if (!response.isValid) throw new Error("Invalid project calculation");
  const block =
    data.settings.blockMode === "custom"
      ? { name: "", ...data.settings.customBlock }
      : blockDefinitions.find(
          (item) => item.id === data.settings.selectedBlockId,
        );
  if (!block) throw new Error("Invalid block");
  const names = new Map([
    ...data.rooms.map((room) => [room.id, room.name] as const),
    ...data.walls.map((wall) => [wall.id, wall.name] as const),
    ...data.rooms.flatMap((room) =>
      room.walls.map(
        (wall) =>
          [
            wall.id,
            [room.name, wall.name].filter(Boolean).join(" — "),
          ] as const,
      ),
    ),
  ]);
  const rooms = response.result.units.map((unit) => ({
    name: names.get(unit.id) ?? "",
    gross: unit.grossWallArea,
    openings: unit.totalOpeningArea + unit.totalStructuralDeductionArea,
    net: unit.netWallArea,
  }));
  const scenarios = (data.scenarioComparison?.scenarios ?? []).flatMap(
    (scenario) => {
      const scenarioResponse = calculateScenario(data, scenario);
      if (!scenarioResponse.isValid) {
        if (options.kind === "scenarios")
          throw new Error("Invalid scenario calculation");
        return [];
      }
      const current = scenarioResponse.result;
      return [
        {
          name: scenario.name,
          block: scenarioBlock(scenario)?.name ?? scenario.selectedBlockId,
          base: current.requiredBlocks,
          waste: current.wasteBlocks,
          final: current.recommendedBlocks,
          total: current.cost?.grandTotal,
          currency: current.cost?.currency,
          baseline: data.scenarioComparison?.baselineScenarioId === scenario.id,
        },
      ];
    },
  );
  if (options.kind === "scenarios" && scenarios.length === 0)
    throw new Error("Invalid scenarios");
  return {
    issuer: options.issuer || "BlockSystem / RekApps",
    contact: options.contact,
    kind: options.kind,
    reference: options.reference,
    issuedAt: options.issuedAt,
    validUntil: options.validUntil,
    fileName: `BlockSystem_${safeName(data.metadata.projectName)}_${safeName(options.reference)}.pdf`,
    project: {
      name: data.metadata.projectName,
      reference: data.metadata.projectNumber || undefined,
      client: data.metadata.clientName || data.metadata.ownerName || undefined,
      location: data.metadata.location || undefined,
      status: data.metadata.status,
    },
    result: response.result,
    block: {
      name: block.name,
      specification: `${block.lengthCm} × ${block.heightCm} × ${block.thicknessCm} cm`,
    },
    rooms,
    scenarios,
    notes: options.notes,
    terms: options.terms,
    preparedBy: options.preparedBy,
  };
}
