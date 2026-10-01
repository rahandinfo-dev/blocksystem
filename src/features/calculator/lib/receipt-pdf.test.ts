import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blockDefinitions } from "../config/blocks.ts";
import { createDefaultProject } from "./project-state.ts";
import { buildReceiptData, getReceiptScopes } from "./receipt-data.ts";
import { renderReceiptPdf } from "./receipt-pdf.ts";

test("normal receipt PDF export renders without verification metadata", async () => {
  const data = createDefaultProject();
  data.metadata.projectName = "PDF export";
  data.rooms[0] = {
    ...data.rooms[0],
    length: "6",
    width: "4",
    height: "2.8",
  };
  const [scope] = getReceiptScopes(data);
  const receipt = buildReceiptData(data, blockDefinitions[1], {
    scopeId: scope.id,
    generatedAt: new Date("2026-10-01T10:00:00.000Z"),
  });
  const pdf = await renderReceiptPdf(receipt);
  assert.ok(pdf.byteLength > 1_000);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const renderer = await readFile(new URL("./receipt-pdf.ts", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /verification|certificate|fingerprint|qrcode/i);
});
