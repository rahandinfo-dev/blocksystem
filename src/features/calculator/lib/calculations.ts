import type {
  CalculationResponse,
  NumericOpening,
  NumericUnit,
  ProjectCalculationInput,
  UnitCalculationResult,
} from "@/features/calculator/types";

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isValidOpening(opening: NumericOpening): boolean {
  return (
    isPositiveFinite(opening.width) &&
    isPositiveFinite(opening.height) &&
    Number.isInteger(opening.quantity) &&
    opening.quantity > 0
  );
}

function getOpeningsArea(openings: NumericOpening[]): number {
  return openings.reduce((total, opening) => total + opening.width * opening.height * opening.quantity, 0);
}

function calculateUnit(unit: NumericUnit, blockHeightCm: number, blockLengthCm: number, mortarJointThicknessCm: number): UnitCalculationResult | null {
  if (!isPositiveFinite(unit.length) || !isPositiveFinite(unit.height) || (unit.kind === "room" && !isPositiveFinite(unit.width ?? NaN))) {
    return null;
  }

  const otherOpenings = unit.otherOpenings ?? [];
  const structuralDeductions = unit.structuralDeductions ?? [];
  if (![...unit.doors, ...unit.windows, ...otherOpenings, ...structuralDeductions].every(isValidOpening)) {
    return null;
  }

  const grossWallArea = unit.kind === "room" ? 2 * (unit.length + (unit.width ?? 0)) * unit.height : unit.length * unit.height;
  const totalDoorArea = getOpeningsArea(unit.doors);
  const totalWindowArea = getOpeningsArea(unit.windows);
  const totalOtherOpeningArea = getOpeningsArea(otherOpenings);
  const totalStructuralDeductionArea = getOpeningsArea(structuralDeductions);
  const totalOpeningArea = totalDoorArea + totalWindowArea + totalOtherOpeningArea;
  const totalDeductions = totalOpeningArea + totalStructuralDeductionArea;

  if (!Number.isFinite(totalDeductions) || totalDeductions >= grossWallArea) {
    return null;
  }

  return {
    id: unit.id,
    name: unit.name,
    grossWallArea,
    totalDoorArea,
    totalWindowArea,
    totalOpeningArea,
    totalOtherOpeningArea,
    totalStructuralDeductionArea,
    netWallArea: grossWallArea - totalDeductions,
    estimatedRows: Math.ceil((unit.height * 100) / (blockHeightCm + mortarJointThicknessCm)),
    estimatedBlocksPerRow: Math.ceil((unit.length * 100) / blockLengthCm),
    hasCutEstimate: (unit.length * 100) % blockLengthCm > 0.001,
  };
}

/**
 * Pure project-level calculation. Block thickness is deliberately never used
 * for quantity: only visible face length × height determines block count.
 */
export function calculateProject(input: ProjectCalculationInput): CalculationResponse {
  const { units, block, wastePercentage, unitPrice, currency = "IQD", exchangeRateIqdPerUsd, mortarConsumptionM3PerM2, mortarJointThicknessCm = 0, costExtras } = input;

  if (![block.lengthCm, block.heightCm, block.thicknessCm].every(isPositiveFinite)) {
    return { isValid: false, error: "invalid-block" };
  }

  if (!Number.isFinite(wastePercentage) || wastePercentage < 0 || wastePercentage > 100) {
    return { isValid: false, error: "invalid-waste" };
  }

  if (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
    return { isValid: false, error: "invalid-price" };
  }

  if (mortarConsumptionM3PerM2 !== undefined && !isPositiveFinite(mortarConsumptionM3PerM2)) {
    return { isValid: false, error: "invalid-mortar" };
  }

  if (!Number.isFinite(mortarJointThicknessCm) || mortarJointThicknessCm < 0) return { isValid: false, error: "invalid-mortar" };

  const extraCosts = [costExtras?.transportCost, costExtras?.laborCost, costExtras?.mortarCost, costExtras?.otherCost];
  if (extraCosts.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) return { isValid: false, error: "invalid-price" };

  const results: UnitCalculationResult[] = [];
  for (const unit of units.filter((candidate) => candidate.enabled !== false)) {
    const result = calculateUnit(unit, block.heightCm, block.lengthCm, mortarJointThicknessCm);
    if (!result) {
      const hasInvalidDimensions = !isPositiveFinite(unit.length) || !isPositiveFinite(unit.height) || (unit.kind === "room" && !isPositiveFinite(unit.width ?? NaN));
      if (hasInvalidDimensions) {
        return { isValid: false, error: unit.kind === "room" ? "invalid-room" : "invalid-wall" };
      }
      const hasInvalidOpening = ![...unit.doors, ...unit.windows, ...(unit.otherOpenings ?? []), ...(unit.structuralDeductions ?? [])].every(isValidOpening);
      return { isValid: false, error: hasInvalidOpening ? "invalid-opening" : "openings-too-large" };
    }
    results.push(result);
  }

  if (results.length === 0) {
    return { isValid: false, error: input.mode === "rooms" ? "invalid-room" : "invalid-wall" };
  }

  const grossWallArea = results.reduce((total, result) => total + result.grossWallArea, 0);
  const totalDoorArea = results.reduce((total, result) => total + result.totalDoorArea, 0);
  const totalWindowArea = results.reduce((total, result) => total + result.totalWindowArea, 0);
  const totalOtherOpeningArea = results.reduce((total, result) => total + result.totalOtherOpeningArea, 0);
  const totalStructuralDeductionArea = results.reduce((total, result) => total + result.totalStructuralDeductionArea, 0);
  const totalOpeningArea = totalDoorArea + totalWindowArea + totalOtherOpeningArea;
  const netWallArea = results.reduce((total, result) => total + result.netWallArea, 0);
  const blockFaceArea = (block.lengthCm / 100) * (block.heightCm / 100);
  const rawBlockCount = netWallArea / blockFaceArea;
  const requiredBlocks = Math.ceil(rawBlockCount);
  const wasteBlocks = Math.ceil((requiredBlocks * wastePercentage) / 100);
  const recommendedBlocks = requiredBlocks + wasteBlocks;

  if (![grossWallArea, netWallArea, blockFaceArea, rawBlockCount, requiredBlocks, recommendedBlocks].every(Number.isFinite)) {
    return { isValid: false, error: "invalid-block" };
  }

  return {
    isValid: true,
    result: {
      grossWallArea,
      totalDoorArea,
      totalWindowArea,
      totalOpeningArea,
      totalOtherOpeningArea,
      totalStructuralDeductionArea,
      netWallArea,
      blockFaceArea,
      rawBlockCount,
      requiredBlocks,
      wastePercentage,
      wasteBlocks,
      recommendedBlocks,
      units: results,
      cost:
        unitPrice === undefined
          ? undefined
          : {
              currency,
              exchangeRateIqdPerUsd: currency === "USD" && Number.isFinite(exchangeRateIqdPerUsd) && (exchangeRateIqdPerUsd ?? 0) > 0 ? exchangeRateIqdPerUsd : undefined,
              unitPrice,
              baseBlockCost: requiredBlocks * unitPrice,
              wasteCost: wasteBlocks * unitPrice,
              recommendedTotalCost: recommendedBlocks * unitPrice,
              transportCost: costExtras?.transportCost ?? 0,
              laborCost: costExtras?.laborCost ?? 0,
              mortarCost: costExtras?.mortarCost ?? 0,
              otherCost: costExtras?.otherCost ?? 0,
              otherCostLabel: costExtras?.otherCostLabel,
              grandTotal: recommendedBlocks * unitPrice + (costExtras?.transportCost ?? 0) + (costExtras?.laborCost ?? 0) + (costExtras?.mortarCost ?? 0) + (costExtras?.otherCost ?? 0),
            },
      mortar:
        mortarConsumptionM3PerM2 === undefined
          ? undefined
          : {
              consumptionM3PerM2: mortarConsumptionM3PerM2,
              estimatedVolumeM3: netWallArea * mortarConsumptionM3PerM2,
            },
    },
  };
}
