import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { ProjectDocumentData } from "./project-document.ts";
import { documentSections } from "./document-presentation.ts";
import { documentText } from "../../../lib/document-messages.ts";
import type { Language } from "../../../lib/i18n";
import { pdfTextRuns } from "./pdf-bidi.ts";

/** The existing PDF pipeline, with measured text, NRT shaping, pagination and issued-record QR. */
export async function renderProjectDocumentPdf(
  data: ProjectDocumentData,
  language: Language = "en-GB",
  verification?: {
    url: string;
    reference: string;
    fingerprint: string;
    revoked: boolean;
  },
): Promise<Buffer> {
  const font = await readFile(
    join(process.cwd(), "src", "app", "fonts", "NRT-Reg.ttf"),
  );
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: { Title: data.reference, Author: data.issuer || "BlockSystem" },
  });
  doc.registerFont("NRT", font);
  doc.font("NRT");
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const t = (key: string) => documentText(language, `documents.${key}`);
  const rtl = language !== "en-GB";
  const margin = 42;
  const width = doc.page.width - margin * 2;
  const bottom = doc.page.height - 48;
  let y = 42;
  const wrap = (text: string, w: number, size = 10) => {
    doc.fontSize(size);
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (doc.widthOfString(`${line} ${word}`.trim()) <= w) {
          line = `${line} ${word}`.trim();
          continue;
        }
        if (line) lines.push(line);
        line = "";
        for (const ch of word) {
          if (doc.widthOfString(line + ch) > w) {
            lines.push(line);
            line = "";
          }
          line += ch;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const draw = (text: string, x: number, top: number, w: number, size = 10) => {
    const runs = pdfTextRuns(
      text,
      rtl && /[\u0600-\u06ff]/.test(text) ? "rtl" : "ltr",
    ).map((value) => {
      const font = /^[²³]$/.test(value) ? "Helvetica" : "NRT";
      doc.font(font).fontSize(size);
      return { value, font, width: doc.widthOfString(value) };
    });
    let cursor =
      x + (rtl ? w - runs.reduce((sum, run) => sum + run.width, 0) : 0);
    for (const run of runs) {
      doc
        .font(run.font)
        .fontSize(size)
        .fillColor("#0F2053")
        .text(run.value, cursor, top, { lineBreak: false });
      cursor += run.width;
    }
    doc.font("NRT");
  };
  const header = () => {
    for (const line of wrap(data.issuer || "BlockSystem", width, 14)) {
      draw(line, margin, y, width, 14);
      y += 22;
    }
    y += 4;
    draw(t(data.kind), margin, y, width, 13);
    y += 22;
    draw(data.reference, margin, y, width, 9);
    y += 24;
    doc
      .strokeColor("#0F2053")
      .moveTo(margin, y)
      .lineTo(margin + width, y)
      .stroke();
    y += 16;
  };
  const ensure = (height: number) => {
    if (y + height > bottom) {
      doc.addPage({ size: "A4", margin: 0 });
      y = 42;
      header();
    }
  };
  header();
  if (data.contact) {
    for (const line of wrap(data.contact, width)) {
      ensure(16);
      draw(line, margin, y, width);
      y += 16;
    }
    y += 10;
  }
  for (const section of documentSections(data, language)) {
    const titles = wrap(section.title, width - 16, 11);
    ensure(titles.length * 17 + 48);
    doc.rect(margin, y, width, titles.length * 17 + 8).fill("#EDE6CC");
    for (const line of titles) {
      draw(line, margin + 8, y + 4, width - 16, 11);
      y += 17;
    }
    y += 14;
    for (const [label, value] of section.rows) {
      if (!label) {
        for (const line of wrap(value, width)) {
          ensure(17);
          draw(line, margin, y, width);
          y += 17;
        }
        y += 10;
        continue;
      }
      const lw = width * 0.4;
      const vw = width - lw - 16;
      const left = wrap(label, lw, 9);
      const right = wrap(value, vw, 10);
      const count = Math.max(left.length, right.length);
      for (let i = 0; i < count; i++) {
        ensure(18);
        if (left[i])
          draw(left[i], rtl ? margin + width - lw : margin, y, lw, 9);
        if (right[i])
          draw(right[i], rtl ? margin : margin + lw + 16, y, vw, 10);
        y += 18;
      }
      doc
        .strokeColor("#D5D7DD")
        .moveTo(margin, y)
        .lineTo(margin + width, y)
        .stroke();
      y += 8;
    }
    y += 10;
  }
  if (verification) {
    ensure(138);
    const qr = await QRCode.toBuffer(verification.url, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 480,
    });
    doc.image(qr, rtl ? margin + width - 104 : margin, y, {
      width: 104,
      height: 104,
    });
    const x = rtl ? margin : margin + 120;
    const w = width - 120;
    for (const line of wrap(t("scan"), w, 11)) {
      draw(line, x, y, w, 11);
      y += 18;
    }
    draw(verification.reference, x, y + 6, w, 10);
    draw(verification.revoked ? t("revoked") : t("valid"), x, y + 26, w, 10);
    draw(verification.fingerprint.slice(0, 24), x, y + 46, w, 8);
    y += 100;
  }
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#566179")
      .text(
        `${data.reference} · ${i + 1} / ${pages.count}`,
        margin,
        doc.page.height - 30,
        { width, align: "center", lineBreak: false },
      );
  }
  doc.end();
  return output;
}
