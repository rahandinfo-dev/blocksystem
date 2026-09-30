import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import type { ProjectDocumentData } from "./project-document";

const money = (value: number, currency: "IQD" | "USD") => currency === "USD" ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : `${value.toLocaleString("en-US")} IQD`;

export async function renderProjectDocumentPdf(data: ProjectDocumentData): Promise<Buffer> {
  const font = await readFile(join(process.cwd(), "src", "app", "fonts", "NRT-Reg.ttf"));
  const doc = new PDFDocument({ size: "A4", margin: 42 }); doc.registerFont("NRT", font);
  const chunks: Buffer[] = []; const output = new Promise<Buffer>((resolve, reject) => { doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const width = doc.page.width - 84; let y = 42;
  const ensure = (height: number) => { if (y + height > doc.page.height - 55) { doc.addPage({ size: "A4", margin: 42 }); y = 42; } };
  const line = (label: string, value: string, bold = false) => { ensure(20); doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#15203C").text(label, 42, y, { width: width * .45 }); doc.font("Helvetica").text(value, 42 + width * .47, y, { width: width * .53, align: "right" }); y += 20; };
  const section = (title: string) => { ensure(31); doc.roundedRect(42, y, width, 22, 4).fill("#EDE6CC"); doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F2053").text(title, 51, y + 6); y += 30; };
  const title = data.kind === "quotation" ? "QUOTATION" : data.kind === "detailed" ? "DETAILED CALCULATION REPORT" : data.kind === "scenarios" ? "SCENARIO COMPARISON REPORT" : "PROJECT ESTIMATE";
  doc.rect(0, 0, doc.page.width, 86).fill("#0F2053"); doc.font("Helvetica-Bold").fontSize(20).fillColor("#fff").text(title, 42, 29); doc.font("Helvetica").fontSize(9).fillColor("#EDE6CC").text(`BlockSystem · ${data.reference}`, 42, 58); y = 108;
  section("PROJECT INFORMATION"); line("Project", data.project.name, true); if (data.project.reference) line("Project reference", data.project.reference); if (data.project.client) line("Client", data.project.client); if (data.project.location) line("Location", data.project.location); line("Issue date", data.issuedAt); if (data.validUntil) line("Valid until", data.validUntil);
  section("MATERIAL & CALCULATION SUMMARY"); line("Block", `${data.block.name} · ${data.block.specification}`); line("Gross wall area", `${data.result.grossWallArea.toFixed(2)} m²`); line("Openings", `${(data.result.totalOpeningArea + data.result.totalStructuralDeductionArea).toFixed(2)} m²`); line("Net wall area", `${data.result.netWallArea.toFixed(2)} m²`, true); line("Base quantity", `${data.result.requiredBlocks} pcs`); line("Waste", `${data.result.wasteBlocks} pcs (${data.result.wastePercentage}%)`); line("Final required quantity", `${data.result.recommendedBlocks} pcs`, true);
  if (data.result.cost) { const cost = data.result.cost; section("COST BREAKDOWN"); line("Unit price", money(cost.unitPrice, cost.currency)); line("Material", money(cost.recommendedTotalCost, cost.currency)); if (cost.laborCost) line("Labour", money(cost.laborCost, cost.currency)); if (cost.transportCost) line("Transport", money(cost.transportCost, cost.currency)); if (cost.mortarCost + cost.otherCost) line(cost.otherCostLabel || "Additional costs", money(cost.mortarCost + cost.otherCost, cost.currency)); ensure(36); doc.roundedRect(42, y, width, 29, 4).fill("#0F2053"); doc.font("Helvetica-Bold").fontSize(12).fillColor("#fff").text(`GRAND TOTAL  ${money(cost.grandTotal, cost.currency)}`, 52, y + 9, { width: width - 20, align: "right" }); y += 39; }
  if (data.kind === "detailed") { section("ROOM / WALL BREAKDOWN"); data.rooms.forEach((room) => line(room.name, `Gross ${room.gross.toFixed(2)} m² · Openings ${room.openings.toFixed(2)} m² · Net ${room.net.toFixed(2)} m²`)); }
  if (data.kind === "scenarios" && data.scenarios.length) { section("SCENARIO COMPARISON"); data.scenarios.forEach((scenario) => line(`${scenario.baseline ? "Baseline · " : ""}${scenario.name}`, `${scenario.block} · ${scenario.base} + ${scenario.waste} = ${scenario.final} pcs${scenario.total !== undefined ? ` · ${money(scenario.total, scenario.currency!)}` : ""}`)); }
  if (data.notes) { section("NOTES"); doc.font("Helvetica").fontSize(9).fillColor("#15203C").text(data.notes, 42, y, { width }); y += Math.max(28, doc.heightOfString(data.notes, { width })); } if (data.terms) { section("TERMS & CONDITIONS"); doc.font("Helvetica").fontSize(9).fillColor("#15203C").text(data.terms, 42, y, { width }); } if (data.preparedBy) { ensure(42); y += 18; doc.font("Helvetica").fontSize(9).fillColor("#15203C").text(`Prepared by: ${data.preparedBy}`, 42, y); doc.moveTo(42, y + 25).lineTo(210, y + 25).stroke(); }
  doc.end(); return output;
}
