import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";

import type { ReceiptData } from "./receipt-data";

const brand = {
  navy: "#0F2053",
  cream: "#EDE6CC",
  ink: "#15203C",
  muted: "#566179",
  rule: "#D5D7DD",
};

const fontPath = join(process.cwd(), "src", "app", "fonts", "NRT-Reg.ttf");

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatMoney(value: number, currency: "IQD" | "USD"): string {
  if (currency === "USD") {
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} IQD`;
}

function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function bufferDocument(document: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Render a real A4 PDF with NRT and Fontkit OpenType shaping on the server. */
export async function renderReceiptPdf(receipt: ReceiptData): Promise<Buffer> {
  const font = await readFile(fontPath);
  const document = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margin: 0,
    bufferPages: true,
    info: {
      Title: receipt.fileName.replace(/\.pdf$/i, ""),
      Author: "سیستەمی بلۆکی براندی یەک",
      Subject: "Block calculation receipt",
    },
  });
  const output = bufferDocument(document);
  document.registerFont("NRT", font);

  const pageWidth = document.page.width;
  const pageHeight = document.page.height;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const halfWidth = (contentWidth - 14) / 2;
  let y = 0;

  /**
   * Fontkit performs NRT's OpenType Kurdish shaping for each word. PDFKit has
   * no paragraph bidi pass, so draw logical words from the right edge toward
   * the left. This keeps both word order and connected glyphs correct.
   */
  const drawRtlWords = (
    text: string,
    x: number,
    top: number,
    width: number,
    size = 10,
    color = brand.ink,
  ) => {
    document
      .font("NRT")
      .fontSize(size)
      .fillColor(color);
    const words = text.trim().split(/\s+/).filter(Boolean);
    const space = document.widthOfString(" ");
    let right = x + width;

    for (const word of words) {
      const wordWidth = document.widthOfString(word);
      right -= wordWidth;
      document.text(word, right, top, { lineBreak: false });
      right -= space;
    }
  };
  const rtl = (text: string, x: number, top: number, width: number, size = 10) => {
    drawRtlWords(text, x, top, width, size);
  };
  const rtlMuted = (text: string, x: number, top: number, width: number, size = 9) => {
    drawRtlWords(text, x, top, width, size, brand.muted);
  };
  const ltr = (text: string, x: number, top: number, width: number, size = 9, color = brand.ink) => {
    document
      .font("Helvetica")
      .fontSize(size)
      .fillColor(color)
      .text(text, x, top, { width, align: "left", lineBreak: false });
  };
  const drawHeader = (continued = false) => {
    const headerHeight = continued ? 54 : 114;
    document.rect(0, 0, pageWidth, headerHeight).fill(brand.navy);
    drawRtlWords(
      "سیستەمی بلۆکی براندی یەک",
      margin,
      continued ? 19 : 23,
      contentWidth,
      continued ? 10 : 12,
      brand.cream,
    );
    if (!continued) {
      drawRtlWords(
        receipt.scope.kind === "room" ? "پسووڵەی حیسابی ژوور" : "پسووڵەی حیسابی دیوار",
        margin,
        51,
        contentWidth,
        21,
        "#FFFFFF",
      );
      ltr(receipt.reference, margin, 84, contentWidth, 9, brand.cream);
    } else {
      ltr(receipt.reference, margin, 20, contentWidth, 8, brand.cream);
    }
    y = headerHeight + 22;
  };
  const startNewPage = () => {
    document.addPage({ size: "A4", margin: 0 });
    drawHeader(true);
  };
  const ensure = (height: number) => {
    if (y + height > pageHeight - 52) startNewPage();
  };
  const section = (title: string) => {
    ensure(27);
    document.roundedRect(margin, y, contentWidth, 21, 4).fill(brand.cream);
    rtl(title, margin + 10, y + 5, contentWidth - 20, 11);
    y += 29;
  };
  const row = (
    label: string,
    value: string,
    valueDirection: "ltr" | "rtl" = "ltr",
  ) => {
    ensure(20);
    document
      .strokeColor(brand.rule)
      .lineWidth(0.45)
      .moveTo(margin, y + 17)
      .lineTo(margin + contentWidth, y + 17)
      .stroke();
    rtlMuted(label, margin + halfWidth + 14, y + 3, halfWidth, 9);
    if (valueDirection === "rtl") {
      rtl(value, margin, y + 3, halfWidth, 9);
    } else {
      ltr(value, margin, y + 3, halfWidth, 9);
    }
    y += 20;
  };
  const openingRows = (openings: ReceiptData["doors"], title: string) => {
    if (openings.length === 0) return;
    section(title);
    for (const opening of openings) {
      const name = opening.wallLabel
        ? `${opening.label} — ${opening.wallLabel}`
        : opening.label;
      const value = `${opening.dimensions} × ${formatNumber(opening.quantity, 0)} = ${formatNumber(opening.area)} m²`;
      row(name, value);
    }
  };

  drawHeader();

  section("زانیاری پسووڵە");
  row("ژمارەی پسووڵە", receipt.reference);
  row("بەروار و کات", formatTimestamp(receipt.generatedAt));
  if (receipt.projectName) row("ناوی پڕۆژە", receipt.projectName, "rtl");
  if (receipt.ownerName) row("خاوەنی پڕۆژە", receipt.ownerName, "rtl");
  if (receipt.location) row("شوێن", receipt.location, "rtl");
  row(receipt.scope.kind === "room" ? "ژوور" : "دیوار", receipt.scope.label, "rtl");

  section("ڕەهەندەکان");
  for (const dimension of receipt.dimensions) row(dimension.label, dimension.value);
  row("جۆری بلۆک", receipt.block.name, "rtl");
  row("ڕووی بلۆک", receipt.block.faceDimensions);
  row("قەڵەوی بلۆک", receipt.block.thickness);

  openingRows(receipt.doors, "دەرگاکان");
  openingRows(receipt.windows, "پەنجەرەکان");

  section("وردەکاری حیساب");
  row("ڕووبەری گشتی دیوار", `${formatNumber(receipt.result.grossWallArea)} m²`);
  if (receipt.result.totalDoorArea > 0) {
    row("کەمکردنەوەی دەرگا", `${formatNumber(receipt.result.totalDoorArea)} m²`);
  }
  if (receipt.result.totalWindowArea > 0) {
    row("کەمکردنەوەی پەنجەرە", `${formatNumber(receipt.result.totalWindowArea)} m²`);
  }
  if (receipt.result.totalOtherOpeningArea > 0) {
    row("کەمکردنەوەی کراوەی تر", `${formatNumber(receipt.result.totalOtherOpeningArea)} m²`);
  }
  if (receipt.result.totalStructuralDeductionArea > 0) {
    row("کەمکردنەوەی سازەیی", `${formatNumber(receipt.result.totalStructuralDeductionArea)} m²`);
  }
  row("ڕووبەری پاک", `${formatNumber(receipt.result.netWallArea)} m²`);
  row("بلۆکی پێویست", `${formatNumber(receipt.result.requiredBlocks, 0)} pcs`);
  if (receipt.result.wastePercentage > 0) {
    row(
      "بلۆکی زیادە",
      `${formatNumber(receipt.result.wasteBlocks, 0)} pcs (${formatNumber(receipt.result.wastePercentage)}%)`,
    );
  }

  if (receipt.mortar) {
    section("مۆرتەر");
    row("ڕێژەی مۆرتەر", `${formatNumber(receipt.mortar.consumptionM3PerM2)} m³/m²`);
    row("قەبارەی خەمڵێنراو", `${formatNumber(receipt.mortar.estimatedVolumeM3)} m³`);
  }

  if (receipt.cost) {
    section("وردەکاری تێچوو");
    row("نرخی یەک بلۆک", formatMoney(receipt.cost.unitPrice, receipt.cost.currency));
    row("تێچووی بلۆکی پێویست", formatMoney(receipt.cost.baseBlockCost, receipt.cost.currency));
    if (receipt.cost.wasteCost > 0) row("تێچووی زیادە", formatMoney(receipt.cost.wasteCost, receipt.cost.currency));
    if (receipt.cost.transportCost > 0) row("گواستنەوە", formatMoney(receipt.cost.transportCost, receipt.cost.currency));
    if (receipt.cost.laborCost > 0) row("کرێی کار", formatMoney(receipt.cost.laborCost, receipt.cost.currency));
    if (receipt.cost.mortarCost > 0) row("تێچووی مۆرتەر", formatMoney(receipt.cost.mortarCost, receipt.cost.currency));
    if (receipt.cost.otherCost > 0) row(receipt.cost.otherCostLabel || "تێچووی تر", formatMoney(receipt.cost.otherCost, receipt.cost.currency));
  }

  ensure(receipt.cost ? 65 : 48);
  document.roundedRect(margin, y, contentWidth, receipt.cost ? 57 : 42, 5).fill(brand.navy);
  drawRtlWords("کۆی بلۆکی پێویست", margin + 13, y + 9, contentWidth - 26, 11, brand.cream);
  document
    .font("Helvetica-Bold")
    .fontSize(23)
    .fillColor("#FFFFFF")
    .text(`${formatNumber(receipt.result.recommendedBlocks, 0)} pcs`, margin + 13, y + 20, {
      width: contentWidth - 26,
      align: "left",
      lineBreak: false,
    });
  if (receipt.cost) {
    drawRtlWords("کۆی گشتی", margin + 13, y + 38, contentWidth - 26, 10, brand.cream);
    document
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#FFFFFF")
      .text(formatMoney(receipt.cost.grandTotal, receipt.cost.currency), margin + 13, y + 40, {
        width: contentWidth - 26,
        align: "left",
        lineBreak: false,
      });
  }

  const pages = document.bufferedPageRange();
  for (let page = pages.start; page < pages.start + pages.count; page += 1) {
    document.switchToPage(page);
    document
      .strokeColor(brand.rule)
      .lineWidth(0.45)
      .moveTo(margin, pageHeight - 34)
      .lineTo(pageWidth - margin, pageHeight - 34)
      .stroke();
    drawRtlWords("سیستەمی بلۆکی براندی یەک", margin, pageHeight - 26, contentWidth, 8, brand.muted);
    ltr(`${page + 1} / ${pages.count}`, margin, pageHeight - 26, contentWidth, 8, brand.muted);
  }

  document.end();
  return output;
}
