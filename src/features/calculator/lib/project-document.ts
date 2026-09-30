import { calculateSavedProject } from "./project-analytics.ts";
import { scenarioBlock, calculateScenario } from "./scenario-engine.ts";
import type { CalculatorProjectData, CalculationResult } from "../types/index.ts";

export type DocumentKind = "estimate" | "quotation" | "detailed" | "scenarios";
export type ProjectDocumentOptions = { kind: DocumentKind; reference: string; issuedAt: string; validUntil?: string; notes?: string; terms?: string; preparedBy?: string; includeRooms?: boolean; includeOpenings?: boolean };
export type ProjectDocumentData = { kind: DocumentKind; reference: string; issuedAt: string; validUntil?: string; fileName: string; project: { name: string; reference?: string; client?: string; location?: string; status: string; notes?: string }; result: CalculationResult; block: { name: string; specification: string }; rooms: Array<{ name: string; gross: number; openings: number; net: number }>; scenarios: Array<{ name: string; block: string; base: number; waste: number; final: number; total?: number; currency?: "IQD" | "USD"; baseline: boolean }>; notes?: string; terms?: string; preparedBy?: string };

function safeName(value: string) { return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "Project"; }
/** One document snapshot, entirely derived by the authoritative calculation/scenario engines. */
export function buildProjectDocument(data: CalculatorProjectData, options: ProjectDocumentOptions): ProjectDocumentData {
  const response = calculateSavedProject(data);
  if (!response.isValid) throw new Error("Invalid project calculation");
  const block = data.settings.blockMode === "custom" ? { name: "Custom block", ...data.settings.customBlock } : { name: data.settings.selectedBlockId, thicknessCm: Number(data.settings.selectedBlockId.replace("cm", "")), lengthCm: 40, heightCm: 20 };
  const rooms = response.result.units.map((unit) => ({ name: unit.name, gross: unit.grossWallArea, openings: unit.totalOpeningArea + unit.totalStructuralDeductionArea, net: unit.netWallArea }));
  const scenarios = (data.scenarioComparison?.scenarios ?? []).flatMap((scenario) => { const scenarioResponse = calculateScenario(data, scenario); if (!scenarioResponse.isValid) return []; const current = scenarioResponse.result; return [{ name: scenario.name, block: scenarioBlock(scenario)?.name ?? scenario.selectedBlockId, base: current.requiredBlocks, waste: current.wasteBlocks, final: current.recommendedBlocks, total: current.cost?.grandTotal, currency: current.cost?.currency, baseline: data.scenarioComparison?.baselineScenarioId === scenario.id }]; });
  return { kind: options.kind, reference: options.reference, issuedAt: options.issuedAt, validUntil: options.validUntil, fileName: `BlockSystem_${safeName(data.metadata.projectName)}_${safeName(options.reference)}.pdf`, project: { name: data.metadata.projectName || "Untitled project", reference: data.metadata.projectNumber || undefined, client: data.metadata.clientName || data.metadata.ownerName || undefined, location: data.metadata.location || undefined, status: data.metadata.status, notes: data.metadata.notes || undefined }, result: response.result, block: { name: block.name, specification: `${block.lengthCm} × ${block.heightCm} × ${block.thicknessCm} cm` }, rooms, scenarios, notes: options.notes, terms: options.terms, preparedBy: options.preparedBy };
}
