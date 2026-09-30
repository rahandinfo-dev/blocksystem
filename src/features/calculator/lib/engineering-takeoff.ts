import { blockDefinitions } from "../config/blocks.ts";
import { calculateSavedProject } from "./project-analytics.ts";
import { calculateScenario } from "./scenario-engine.ts";
import type { CalculatorProjectData, CalculationResult, OpeningInput } from "../types/index.ts";

export type EngineeringSeverity = "ERROR" | "WARNING" | "INFO";
export type EngineeringIssue = { severity: EngineeringSeverity; code: string; messageKey: string; entityType: "project" | "room" | "wall" | "opening" | "settings"; entityId?: string; field?: string };
export type OpeningScheduleRow = { id: string; type: "door" | "window" | "opening" | "deduction"; name: string; host: string; width: number; height: number; quantity: number; area: number };
export type BoqRow = { number: string; description: string; unit: "pcs" | "amount"; quantity: number; unitRate?: number; amount: number; currency?: "IQD" | "USD"; trace: string };
export type EngineeringTakeoff = { result?: CalculationResult; issues: EngineeringIssue[]; openings: OpeningScheduleRow[]; boq: BoqRow[]; scenarios: Array<{ id: string; name: string; blocks: number; waste: number; total?: number; currency?: "IQD" | "USD" }>; };
const finitePositive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
const safeName = (value: string, fallback: string) => value.trim() || fallback;
function openingRows(openings: OpeningInput[], type: OpeningScheduleRow["type"], host: string) {
  return openings.map((opening, index) => ({ id: opening.id, type, name: safeName(opening.name, `${type} ${index + 1}`), host, width: Number(opening.width), height: Number(opening.height), quantity: Number(opening.quantity), area: Number(opening.width) * Number(opening.height) * Number(opening.quantity) }));
}
/** Structural/quantity checks only. This is not a code-compliance or structural safety assessment. */
export function validateEngineeringProject(data: CalculatorProjectData): EngineeringIssue[] {
  const issues: EngineeringIssue[] = [];
  if (!data.metadata.projectName.trim()) issues.push({ severity: "WARNING", code: "PROJECT_NAME_MISSING", messageKey: "engineering.projectNameMissing", entityType: "project", field: "projectName" });
  const seen = new Set<string>(); const inspect = (id: string, type: EngineeringIssue["entityType"]) => { if (!id || seen.has(id)) issues.push({ severity: "ERROR", code: "DUPLICATE_OR_MISSING_ID", messageKey: "engineering.invalidReference", entityType: type, entityId: id }); seen.add(id); };
  const inspectOpenings = (openings: OpeningInput[]) => openings.forEach((opening) => { inspect(opening.id, "opening"); if (![opening.width, opening.height, opening.quantity].every(finitePositive)) issues.push({ severity: "ERROR", code: "OPENING_DIMENSION_INVALID", messageKey: "engineering.invalidOpening", entityType: "opening", entityId: opening.id }); if (!Number.isFinite(Number(opening.horizontalPosition)) || !Number.isFinite(Number(opening.sillHeight))) issues.push({ severity: "WARNING", code: "OPENING_POSITION_INVALID", messageKey: "engineering.openingPosition", entityType: "opening", entityId: opening.id }); });
  if (data.mode === "walls") data.walls.forEach((wall) => { inspect(wall.id, "wall"); if (![wall.length, wall.height].every(finitePositive)) issues.push({ severity: "ERROR", code: "WALL_DIMENSION_INVALID", messageKey: "engineering.invalidWall", entityType: "wall", entityId: wall.id }); inspectOpenings(wall.doors); inspectOpenings(wall.windows); });
  else data.rooms.forEach((room) => { inspect(room.id, "room"); if (![room.length, room.width, room.height].every(finitePositive)) issues.push({ severity: "ERROR", code: "ROOM_DIMENSION_INVALID", messageKey: "engineering.invalidRoom", entityType: "room", entityId: room.id }); if (!room.name.trim()) issues.push({ severity: "INFO", code: "ROOM_NAME_MISSING", messageKey: "engineering.roomNameMissing", entityType: "room", entityId: room.id }); inspectOpenings(room.doors); inspectOpenings(room.windows); room.walls.forEach((wall) => { inspect(wall.id, "wall"); inspectOpenings(wall.doors); inspectOpenings(wall.windows); inspectOpenings(wall.otherOpenings); inspectOpenings(wall.structuralDeductions); }); });
  const response = calculateSavedProject(data); if (!response.isValid) issues.push({ severity: "ERROR", code: `CALCULATION_${response.error.toUpperCase().replace(/-/g, "_")}`, messageKey: `errors.${response.error}`, entityType: "project" });
  return issues;
}
function schedule(data: CalculatorProjectData) {
  if (data.mode === "walls") return data.walls.flatMap((wall, index) => [...openingRows(wall.doors, "door", safeName(wall.name, `Wall ${index + 1}`)), ...openingRows(wall.windows, "window", safeName(wall.name, `Wall ${index + 1}`))]);
  return data.rooms.flatMap((room, index) => { const host = safeName(room.name, `Room ${index + 1}`); const simple = [...openingRows(room.doors, "door", host), ...openingRows(room.windows, "window", host)]; const advanced = room.walls.flatMap((wall) => [...openingRows(wall.doors, "door", `${host} — ${wall.name}`), ...openingRows(wall.windows, "window", `${host} — ${wall.name}`), ...openingRows(wall.otherOpenings, "opening", `${host} — ${wall.name}`), ...openingRows(wall.structuralDeductions, "deduction", `${host} — ${wall.name}`)]); return data.settings.interfaceMode === "advanced" ? advanced : simple; });
}
function boq(result: CalculationResult, data: CalculatorProjectData): BoqRow[] {
  const block = data.settings.blockMode === "custom" ? { name: "Custom block", ...data.settings.customBlock } : blockDefinitions.find((item) => item.id === data.settings.selectedBlockId); if (!block) return [];
  const rows: BoqRow[] = [{ number: "1", description: block.name, unit: "pcs", quantity: result.recommendedBlocks, unitRate: result.cost?.unitPrice, amount: result.cost?.recommendedTotalCost ?? 0, currency: result.cost?.currency, trace: "net area ÷ block face + project waste" }];
  if (result.cost) { const extras: Array<[string, number]> = [["Transport", result.cost.transportCost], ["Labour", result.cost.laborCost], ["Mortar", result.cost.mortarCost], [result.cost.otherCostLabel || "Other", result.cost.otherCost]]; extras.filter(([, amount]) => amount > 0).forEach(([description, amount]) => rows.push({ number: String(rows.length + 1), description, unit: "amount", quantity: 1, unitRate: amount, amount, currency: result.cost?.currency, trace: "configured project cost" })); }
  return rows;
}
/** Canonical takeoff/BOQ selector. Quantity and cost values are never recomputed here. */
export function buildEngineeringTakeoff(data: CalculatorProjectData): EngineeringTakeoff {
  const issues = validateEngineeringProject(data); const response = calculateSavedProject(data); const result = response.isValid ? response.result : undefined;
  const scenarios = (data.scenarioComparison?.scenarios ?? []).flatMap((scenario) => { const calculated = calculateScenario(data, scenario); return calculated.isValid ? [{ id: scenario.id, name: scenario.name, blocks: calculated.result.recommendedBlocks, waste: calculated.result.wasteBlocks, total: calculated.result.cost?.grandTotal, currency: calculated.result.cost?.currency }] : []; });
  return { result, issues, openings: schedule(data), boq: result ? boq(result, data) : [], scenarios };
}
export function takeoffCsv(takeoff: EngineeringTakeoff) { const escape = (value: string | number | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`; const lines = [["Item", "Description", "Unit", "Quantity", "Unit rate", "Amount", "Currency"] as Array<string | number>, ...takeoff.boq.map((row) => [row.number, row.description, row.unit, row.quantity, row.unitRate ?? "", row.amount, row.currency ?? ""])]; return `\uFEFF${lines.map((row) => row.map(escape).join(",")).join("\r\n")}`; }
