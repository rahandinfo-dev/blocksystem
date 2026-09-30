import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import type { ScenarioReportData } from "./scenario-report";

export async function renderScenarioReportPdf(report: ScenarioReportData): Promise<Buffer> {
  const font = await readFile(join(process.cwd(), "src", "app", "fonts", "NRT-Reg.ttf"));
  const document = new PDFDocument({ size: "A4", margin: 42, info: { Title: "BlockSystem Scenario Comparison" } });
  document.registerFont("NRT", font); const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  const rtl = report.language !== "en-GB"; const align = rtl ? "right" : "left";
  const text = (value: string, size = 10, color = "#15203C") => document.font(rtl ? "NRT" : "Helvetica").fontSize(size).fillColor(color).text(value, { align });
  document.rect(0, 0, document.page.width, 92).fill("#0F2053"); document.fillColor("#EDE6CC").font(rtl ? "NRT" : "Helvetica").fontSize(21).text(rtl ? "بەراوردی دۆخەکان" : "Scenario comparison", 42, 29, { width: document.page.width - 84, align });
  document.y = 112; text(report.projectName || "BlockSystem", 15); text(report.scope, 10, "#566179"); text(new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(report.generatedAt)), 9, "#566179"); document.moveDown();
  const columns = Math.max(1, report.scenarios.length); const labelWidth = 130; const width = (document.page.width - 84 - labelWidth) / columns;
  const cell = (value: string, x: number, y: number, w: number, bold = false) => { document.font(rtl ? "NRT" : bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor("#15203C").text(value, x + 5, y + 5, { width: w - 10, height: 26, align, ellipsis: true }); };
  let y = document.y; const newPage = () => { document.addPage({ size: "A4", margin: 42 }); y = 45; };
  const drawRow = (label: string, values: string[], shade = false) => { if (y > 740) newPage(); if (shade) document.rect(42, y, document.page.width - 84, 32).fill("#F7F8FA"); document.strokeColor("#D5D7DD").rect(42, y, document.page.width - 84, 32).stroke(); cell(label, 42, y, labelWidth, true); values.forEach((value, index) => cell(value, 42 + labelWidth + index * width, y, width)); y += 32; };
  drawRow(rtl ? "دۆخ" : "Scenario", report.scenarios.map((item) => item.name), true); drawRow(rtl ? "بلۆک" : "Block", report.scenarios.map((item) => item.block)); report.rows.forEach((row, index) => drawRow(row.label, row.values, index % 2 === 0));
  const noted = report.scenarios.filter((scenario) => scenario.notes); if (noted.length) { y += 15; text(rtl ? "تێبینی" : "Notes", 13); noted.forEach((scenario) => text(`${scenario.name}: ${scenario.notes}`, 9)); }
  document.end(); return done;
}
