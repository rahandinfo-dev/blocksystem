import assert from "node:assert/strict";
import test from "node:test";

import { buildShareSummary, shareSummary } from "./share-result.ts";
import { createDefaultProject } from "./project-state.ts";

const labels = { blocks: "Blocks", netArea: "Net area", mortar: "Mortar", total: "Total", measurement: "Measurement" };
const result = { recommendedBlocks: 123, netWallArea: 12.5, mortar: { estimatedVolumeM3: 0.25, consumptionM3PerM2: 0.02 }, cost: { currency: "IQD" as const, grandTotal: 456_000 } } as never;

test("share summary contains only the concise public calculation result", () => {
  const data = createDefaultProject();
  data.metadata.projectName = "House";
  const text = buildShareSummary(data, result, labels, (value) => `${value} IQD`);
  assert.match(text, /House/);
  assert.match(text, /Blocks: 123/);
  assert.match(text, /Net area: 12.5 m²/);
  assert.doesNotMatch(text, /opening-/i);
});

test("sharing uses native share then clipboard fallback, and reports clipboard failure", async () => {
  let shared = "";
  assert.equal(await shareSummary("Title", "Text", { share: async ({ text }) => { shared = text ?? ""; } }), "shared");
  assert.equal(shared, "Text");
  let copied = "";
  assert.equal(await shareSummary("Title", "Text", { clipboard: { writeText: async (text) => { copied = text; } } }), "copied");
  assert.equal(copied, "Text");
  await assert.rejects(() => shareSummary("Title", "Text", {}));
});
