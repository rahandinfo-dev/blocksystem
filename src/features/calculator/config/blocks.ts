import type { BlockDefinition } from "@/features/calculator/types";

/**
 * Project-specific block face sizes were not provided. These deliberately
 * centralized, editable defaults (40 × 20 cm) are not a claim about a local
 * construction standard. Confirm supplier dimensions before using estimates.
 */
export const blockDefinitions: readonly BlockDefinition[] = [
  { id: "10cm", name: "بلۆکی ١٠ سم", thicknessCm: 10, lengthCm: 40, heightCm: 20 },
  { id: "20cm", name: "بلۆکی ٢٠ سم", thicknessCm: 20, lengthCm: 40, heightCm: 20 },
  { id: "30cm", name: "بلۆکی ٣٠ سم", thicknessCm: 30, lengthCm: 40, heightCm: 20 },
] as const;

export const defaultBlockId = blockDefinitions[1].id;
