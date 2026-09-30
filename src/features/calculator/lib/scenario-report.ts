import type { CurrencyCode } from "@/lib/currency";

export interface ScenarioReportRow { label: string; values: string[] }
export interface ScenarioReportData {
  projectName: string; scope: string; generatedAt: string; language: "ku" | "ar" | "en-GB";
  scenarios: Array<{ name: string; block: string; notes: string; currency?: CurrencyCode }>;
  rows: ScenarioReportRow[];
}

export async function downloadScenarioReport(report: ScenarioReportData): Promise<void> {
  const response = await fetch("/api/scenario-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report }) });
  if (!response.ok) throw new Error("Scenario report generation failed.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = "BlockSystem-scenario-comparison.pdf"; link.hidden = true; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
