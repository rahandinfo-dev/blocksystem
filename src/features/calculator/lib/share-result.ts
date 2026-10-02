import type { CalculationResult, CalculatorProjectData } from "../types/index.ts";

export interface ShareLabels {
  blocks: string;
  netArea: string;
  mortar: string;
  total: string;
  measurement: string;
}

export interface SharePlatform {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export function buildShareSummary(
  data: CalculatorProjectData,
  result: CalculationResult,
  labels: ShareLabels,
  formatMoney: (value: number, currency: "IQD" | "USD") => string,
): string {
  const title = data.metadata.projectName.trim() || "BlockSystem";
  const lines = [
    title,
    `${labels.blocks}: ${result.recommendedBlocks}`,
    `${labels.netArea}: ${result.netWallArea.toLocaleString("en-GB", { maximumFractionDigits: 2 })} m²`,
    `${labels.measurement}: ${data.metadata.measurementSystem === "imperial" ? "Imperial" : "Metric"}`,
  ];
  if (result.mortar) lines.push(`${labels.mortar}: ${result.mortar.estimatedVolumeM3.toLocaleString("en-GB", { maximumFractionDigits: 3 })} m³`);
  if (result.cost) lines.push(`${labels.total}: ${formatMoney(result.cost.grandTotal, result.cost.currency)}`);
  return lines.join("\n");
}

/** Progressive enhancement: use the platform sheet, otherwise copy plain text. */
export async function shareSummary(
  title: string,
  text: string,
  platform: SharePlatform,
): Promise<"shared" | "copied"> {
  if (platform.share) {
    await platform.share({ title, text });
    return "shared";
  }
  if (!platform.clipboard) throw new Error("sharing-unavailable");
  await platform.clipboard.writeText(text);
  return "copied";
}
