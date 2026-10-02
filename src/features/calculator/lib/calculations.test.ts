import assert from "node:assert/strict";
import test from "node:test";

import { calculateProject } from "./calculations.ts";
import {
  constrainPosition,
  constrainSillHeight,
  fitOpeningToBounds,
  resolveInputOpeningCollisions,
  resolveOpeningIntervals,
} from "./opening-placement.ts";
import {
  createWallSolidSegments,
  normalizeWallOpeningRects,
} from "./wall-opening-geometry.ts";
import { buildReceiptData, getReceiptScopes } from "./receipt-data.ts";
import { calculationEngineVersion, migrateSavedProject, projectSchemaVersion } from "../../../lib/project-schema.ts";
import { formatMoney, formatMoneyInput } from "../../../lib/currency.ts";
import { convertArea, convertLength, convertVolume } from "../../../lib/units.ts";
import { calculateScenario, createScenarioFromProject } from "./scenario-engine.ts";
import { createDefaultProject } from "./project-state.ts";

const standardBlock = { id: "20cm" as const, name: "بلۆکی ٢٠ سم", thicknessCm: 20, lengthCm: 40, heightCm: 20 };

function calculate(overrides: Partial<Parameters<typeof calculateProject>[0]> = {}) {
  return calculateProject({
    mode: "rooms",
    units: [{ id: "room-1", name: "ژووری ١", kind: "room", length: 6, width: 4, height: 2.8, doors: [], windows: [] }],
    block: standardBlock,
    wastePercentage: 5,
    ...overrides,
  });
}

function validResult(response: ReturnType<typeof calculateProject>) {
  if (!response.isValid) throw new Error("Expected a valid calculation response");
  return response.result;
}

test("calculates the documented room, door, window, and 5% waste example", () => {
  const result = validResult(calculate({ units: [{ id: "room-1", name: "ژووری ١", kind: "room", length: 6, width: 4, height: 2.8, doors: [{ width: 0.9, height: 2.1, quantity: 1 }], windows: [{ width: 1.2, height: 1.2, quantity: 2 }] }] }));
  assert.equal(result.grossWallArea, 56);
  assert.equal(Number(result.totalDoorArea.toFixed(2)), 1.89);
  assert.equal(result.totalWindowArea, 2.88);
  assert.equal(Number(result.totalOpeningArea.toFixed(2)), 4.77);
  assert.equal(Number(result.netWallArea.toFixed(2)), 51.23);
  assert.equal(result.requiredBlocks, 641);
  assert.equal(result.wasteBlocks, 33);
  assert.equal(result.recommendedBlocks, 674);
});
test("handles no openings and preset/custom waste values", () => {
  assert.equal(validResult(calculate({ wastePercentage: 0 })).recommendedBlocks, 700);
  assert.equal(validResult(calculate({ wastePercentage: 10 })).recommendedBlocks, 770);
  assert.equal(validResult(calculate({ wastePercentage: 15 })).recommendedBlocks, 805);
  assert.equal(validResult(calculate({ wastePercentage: 7.5 })).recommendedBlocks, 753);
});

test("applies the waste allowance once to the whole-block purchasing base", () => {
  const result = validResult(calculate({
    mode: "walls",
    wastePercentage: 5,
    units: [{ id: "wall", name: "Wall", kind: "wall", length: 1.7, height: 2, doors: [], windows: [] }],
  }));
  assert.equal(result.requiredBlocks, 43);
  assert.equal(result.recommendedBlocks, Math.ceil(result.requiredBlocks * 1.05));
  assert.equal(result.wasteBlocks, result.recommendedBlocks - result.requiredBlocks);
});
test("aggregates multiple rooms and calculates wall mode", () => {
  const rooms = validResult(calculate({ units: [
    { id: "room-1", name: "١", kind: "room", length: 2, width: 2, height: 2, doors: [], windows: [] },
    { id: "room-2", name: "٢", kind: "room", length: 3, width: 2, height: 2, doors: [], windows: [] },
  ] }));
  assert.equal(rooms.grossWallArea, 36);
  assert.equal(rooms.units.length, 2);
  const wall = validResult(calculate({ mode: "walls", units: [{ id: "wall-1", name: "دیوار", kind: "wall", length: 6, height: 2.8, doors: [], windows: [] }] }));
  assert.equal(Number(wall.grossWallArea.toFixed(2)), 16.8);
});
test("uses custom block face dimensions and rejects invalid conditions", () => {
  const custom = validResult(calculate({ block: { id: "custom", name: "تایبەت", thicknessCm: 15, lengthCm: 50, heightCm: 20 }, wastePercentage: 0 }));
  assert.equal(custom.blockFaceArea, 0.1);
  assert.equal(custom.requiredBlocks, 560);
  assert.equal(calculate({ units: [{ id: "x", name: "x", kind: "room", length: 6, width: 4, height: 2.8, doors: [{ width: 10, height: 10, quantity: 1 }], windows: [] }] }).isValid, false);
  assert.equal(calculate({ units: [{ id: "x", name: "x", kind: "room", length: 0, width: 4, height: 2.8, doors: [], windows: [] }] }).isValid, false);
});

test("handles included walls, extra deductions, row estimates, and cost extras", () => {
  const result = validResult(calculate({
    mode: "walls",
    units: [
      { id: "included", name: "١", kind: "wall", length: 4, height: 2.8, doors: [], windows: [], otherOpenings: [{ width: 0.5, height: 0.5, quantity: 1 }], structuralDeductions: [{ width: 0.2, height: 2.8, quantity: 1 }], enabled: true },
      { id: "excluded", name: "٢", kind: "wall", length: 9, height: 3, doors: [], windows: [], enabled: false },
    ],
    mortarJointThicknessCm: 1,
    unitPrice: 1000,
    costExtras: { transportCost: 20000, laborCost: 50000, otherCost: 5000 },
  }));
  assert.equal(Number(result.grossWallArea.toFixed(2)), 11.2);
  assert.equal(Number(result.totalOtherOpeningArea.toFixed(2)), 0.25);
  assert.equal(Number(result.totalStructuralDeductionArea.toFixed(2)), 0.56);
  assert.equal(Number(result.netWallArea.toFixed(2)), 10.39);
  assert.equal(result.units[0].estimatedRows, 14);
  assert.equal(result.units[0].estimatedBlocksPerRow, 10);
  assert.equal(result.units[0].hasCutEstimate, false);
  assert.equal(result.cost?.grandTotal, result.recommendedBlocks * 1000 + 75000);
});

test("calculates configured cost components without requiring a block price", () => {
  const result = validResult(calculate({
    unitPrice: undefined,
    costExtras: { transportCost: 100, laborCost: 200, mortarCost: 300, otherCost: 400 },
  }));
  assert.equal(result.cost?.recommendedTotalCost, 0);
  assert.equal(result.cost?.grandTotal, 1000);
});

test("rejects malformed, NaN, and infinite engineering inputs", () => {
  assert.equal(calculate({ wastePercentage: Number.NaN }).isValid, false);
  assert.equal(calculate({ wastePercentage: Infinity }).isValid, false);
  assert.equal(calculate({ unitPrice: Infinity }).isValid, false);
  assert.equal(calculate({ costExtras: { laborCost: Number.NaN } }).isValid, false);
});

test("migrates a version-one saved project without losing its calculation inputs", () => {
  const migrated = migrateSavedProject({ version: 1, id: "legacy", name: "پڕۆژە", savedAt: "2026-01-01T00:00:00.000Z", data: { mode: "rooms", metadata: {}, rooms: [{ id: "room", name: "", length: "6", width: "4", height: "2.8", doors: [], windows: [] }], walls: [], settings: { selectedBlockId: "20cm" } } });
  assert.ok(migrated);
  assert.equal(migrated.version, projectSchemaVersion);
  assert.equal(migrated.calculationEngineVersion, calculationEngineVersion);
  assert.equal(migrated.data.rooms[0].walls.length, 4);
  assert.equal(migrated.data.rooms[0].length, "6");
  assert.equal(migrated.data.settings.currency, "IQD");
});

test("converts only like dimensions using metre-based canonical values", () => {
  assert.equal(convertLength(1, "m", "cm"), 100);
  assert.equal(convertLength(1, "m", "mm"), 1000);
  assert.equal(convertLength(600, "cm", "m"), 6);
  assert.equal(convertLength(2.8, "m", "cm"), 280);
  assert.equal(convertArea(1_000_000, "mm²", "m²"), 1);
  assert.equal(convertArea(1, "m²", "cm²"), 10_000);
  assert.equal(convertArea(1, "m²", "mm²"), 1_000_000);
  assert.equal(convertVolume(1_000_000, "cm³", "m³"), 1);
  assert.equal(convertVolume(1, "m³", "cm³"), 1_000_000);
  assert.equal(convertVolume(1, "m³", "mm³"), 1_000_000_000);
});

test("keeps persisted door and window placement inside physical wall bounds", () => {
  assert.equal(constrainPosition("5.8", 0.9, 6), "5.1");
  assert.equal(constrainPosition("-1", 0.9, 6), "0");
  assert.equal(constrainSillHeight("2.1", 1.2, 2.8), "1.6");
  const fitted = fitOpeningToBounds(
    {
      width: "5",
      height: "2.5",
      horizontalPosition: "4",
      sillHeight: "1.5",
    },
    { length: 3, height: 2.8 },
  );
  assert.deepEqual(fitted, {
    width: "3",
    height: "2.5",
    horizontalPosition: "0",
    sillHeight: "0.3",
  });
});

test("resolves colliding opening positions and quantity copies deterministically", () => {
  const inputs = resolveInputOpeningCollisions(
    [
      { id: "door", width: "1", quantity: "1", horizontalPosition: "1" },
      { id: "window", width: "1", quantity: "1", horizontalPosition: "1" },
    ],
    6,
  );
  assert.notEqual(inputs[0].horizontalPosition, inputs[1].horizontalPosition);
  const intervals = resolveOpeningIntervals(
    [
      { id: "door-0", width: 1, preferredStart: 0 },
      { id: "door-1", width: 1, preferredStart: 1.12 },
      { id: "door-2", width: 1, preferredStart: 2.24 },
    ],
    6,
  );
  for (let index = 0; index < intervals.length; index += 1) {
    for (let comparison = index + 1; comparison < intervals.length; comparison += 1) {
      const left = intervals[index];
      const right = intervals[comparison];
      assert.ok(
        left.start + left.width <= right.start || right.start + right.width <= left.start,
      );
    }
  }
});

test("cuts every wall opening out of the solid 3D wall face", () => {
  const openings = [
    { id: "window-a", x: -1.6, bottom: 0.9, width: 1.2, height: 1.1 },
    { id: "window-b", x: 0.1, bottom: 1.15, width: 0.8, height: 0.9 },
    { id: "door", x: 1.85, bottom: 0, width: 0.9, height: 2.1 },
  ];
  const normalized = normalizeWallOpeningRects(6, 3, openings);
  const segments = createWallSolidSegments(6, 3, openings);
  const solidArea = segments.reduce(
    (total, segment) => total + segment.width * segment.height,
    0,
  );
  const openingArea = normalized.reduce(
    (total, opening) => total + (opening.right - opening.left) * (opening.top - opening.bottom),
    0,
  );

  assert.ok(Math.abs(solidArea - (6 * 3 - openingArea)) < 0.000001);
  for (const opening of normalized) {
    for (const segment of segments) {
      const segmentLeft = segment.x - segment.width / 2;
      const segmentRight = segment.x + segment.width / 2;
      const segmentBottom = segment.y - segment.height / 2;
      const segmentTop = segment.y + segment.height / 2;
      const overlapsOpening =
        segmentLeft < opening.right - 0.000001 &&
        segmentRight > opening.left + 0.000001 &&
        segmentBottom < opening.top - 0.000001 &&
        segmentTop > opening.bottom + 0.000001;
      assert.equal(overlapsOpening, false);
    }
  }
});

test("formats IQD and USD money consistently and keeps the documented calculation invariant", () => {
  assert.equal(formatMoney(1_250_000, "IQD"), "1,250,000 دینار");
  assert.equal(formatMoneyInput("1000"), "1,000");
  assert.equal(formatMoneyInput("10000"), "10,000");
  assert.equal(formatMoneyInput("100000"), "100,000");
  assert.equal(formatMoneyInput("1000000"), "1,000,000");
  assert.equal(formatMoney(1250, "USD"), "$1,250.00");
  const metricEquivalent = validResult(calculate({
    units: [{ id: "cm-room", name: "cm", kind: "room", length: convertLength(600, "cm", "m"), width: convertLength(400, "cm", "m"), height: convertLength(280, "cm", "m"), doors: [{ width: 0.9, height: 2.1, quantity: 1 }], windows: [{ width: 1.2, height: 1.2, quantity: 2 }] }],
  }));
  assert.equal(metricEquivalent.recommendedBlocks, 674);
});

test("builds a scoped room receipt from canonical metre inputs without recalculating unrelated rooms", () => {
  const data = {
    mode: "rooms",
    metadata: { projectName: "پڕۆژەی تاقیکردنەوە", ownerName: "", location: "", notes: "" },
    rooms: [
      {
        id: "room-a",
        name: "ژووری یەک",
        length: "6",
        width: "4",
        height: "2.8",
        lengthUnit: "m",
        widthUnit: "m",
        heightUnit: "m",
        doors: [{ id: "door-a", name: "", width: "0.9", height: "2.1", quantity: "1", widthUnit: "cm", heightUnit: "cm", wallId: "", horizontalPosition: "0", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }],
        windows: [{ id: "window-a", name: "", width: "1.2", height: "1.2", quantity: "2", widthUnit: "m", heightUnit: "m", wallId: "", horizontalPosition: "0", horizontalPositionUnit: "m", sillHeight: "0.9", sillHeightUnit: "m" }],
        walls: [],
      },
      {
        id: "room-b",
        name: "ژووری دوو",
        length: "10",
        width: "8",
        height: "3",
        lengthUnit: "m",
        widthUnit: "m",
        heightUnit: "m",
        doors: [],
        windows: [],
        walls: [],
      },
    ],
    walls: [],
    settings: {
      interfaceMode: "quick",
      wastePreset: "5",
      customWastePercentage: "",
      unitPrice: "1000",
      currency: "IQD",
      exchangeRateIqdPerUsd: "",
      mortarEnabled: false,
      mortarConsumptionM3PerM2: "",
      mortarJointEnabled: false,
      mortarJointThicknessCm: "",
      transportCost: "0",
      laborCost: "0",
      mortarCost: "0",
      otherCost: "0",
      otherCostLabel: "",
    },
  } as never;

  const [firstRoom] = getReceiptScopes(data);
  const receipt = buildReceiptData(data, standardBlock, {
    scopeId: firstRoom.id,
    generatedAt: new Date("2026-09-28T10:30:00.000Z"),
    reference: "REK-20260928-001",
  });
  assert.equal(receipt.scope.kind, "room");
  assert.equal(receipt.result.units.length, 1);
  assert.equal(receipt.result.recommendedBlocks, 674);
  assert.equal(receipt.doors[0].dimensions, "90 cm × 210 cm");
  assert.equal(receipt.fileName, "BlockSystem-Room-2026-09-28.pdf");
  assert.equal(receipt.cost?.grandTotal, 674_000);
});

test("builds a current wall-only receipt with USD pricing", () => {
  const data = {
    mode: "walls",
    metadata: { projectName: "", ownerName: "", location: "", notes: "" },
    rooms: [],
    walls: [
      {
        id: "wall-a",
        name: "دیوار پێشەوە",
        length: "6",
        height: "2.8",
        lengthUnit: "m",
        heightUnit: "m",
        doors: [{ id: "door-wall", name: "", width: "0.9", height: "2.1", quantity: "1", widthUnit: "m", heightUnit: "m", wallId: "", horizontalPosition: "0", horizontalPositionUnit: "m", sillHeight: "0", sillHeightUnit: "m" }],
        windows: [],
      },
    ],
    settings: {
      interfaceMode: "quick",
      wastePreset: "0",
      customWastePercentage: "",
      unitPrice: "2.5",
      currency: "USD",
      exchangeRateIqdPerUsd: "1300",
      mortarEnabled: false,
      mortarConsumptionM3PerM2: "",
      mortarJointEnabled: false,
      mortarJointThicknessCm: "",
      transportCost: "0",
      laborCost: "0",
      mortarCost: "0",
      otherCost: "0",
      otherCostLabel: "",
    },
  } as never;

  const [wall] = getReceiptScopes(data);
  const receipt = buildReceiptData(data, standardBlock, {
    scopeId: wall.id,
    generatedAt: new Date("2026-09-28T10:30:00.000Z"),
  });
  assert.equal(receipt.scope.kind, "wall");
  assert.equal(Number(receipt.result.grossWallArea.toFixed(2)), 16.8);
  assert.equal(Number(receipt.result.totalDoorArea.toFixed(2)), 1.89);
  assert.equal(receipt.cost?.currency, "USD");
  assert.equal(receipt.fileName, "BlockSystem-Wall-2026-09-28.pdf");
});

test("keeps wall formulas deterministic across openings, waste, and imperial display conversion", () => {
  const response = calculateProject({ mode: "walls", block: standardBlock, wastePercentage: 5, units: [{ id: "wall-6x4", name: "Wall", kind: "wall", length: 6, height: 4, doors: [{ width: 1, height: 2, quantity: 1 }], windows: [{ width: 1, height: 1, quantity: 2 }] }] });
  const result = validResult(response);
  assert.equal(result.grossWallArea, 24);
  assert.equal(result.totalDoorArea, 2);
  assert.equal(result.totalWindowArea, 2);
  assert.equal(result.netWallArea, 20);
  assert.equal(result.requiredBlocks, 250);
  assert.equal(result.wasteBlocks, 13);
  assert.equal(result.recommendedBlocks, 263);
  assert.equal(convertLength(1, "m", "ft"), 3.28083989501312);
  assert.equal(convertLength(12, "in", "ft"), 1);
  assert.equal(convertArea(1, "m²", "ft²"), 10.7639104167097);
});

test("scenario engine independently compares block, waste, cost, canonical geometry and currency safely", () => {
  const data = createDefaultProject();
  data.mode = "walls";
  data.walls = [{ id: "wall", name: "Wall", length: "6", height: "2.8", lengthUnit: "m", heightUnit: "m", doors: [], windows: [] }];
  const first = createScenarioFromProject(data, "a", "A");
  first.wastePercentage = "5"; first.unitPrice = "1000"; first.selectedBlockId = "20cm";
  const second = { ...first, id: "b", name: "B", selectedBlockId: "10cm" as const, wastePercentage: "10", unitPrice: "1500" };
  const a = validResult(calculateScenario(data, first)); const b = validResult(calculateScenario(data, second));
  assert.equal(a.netWallArea, b.netWallArea);
  assert.equal(a.requiredBlocks, b.requiredBlocks); // thickness alone never changes the visible face calculation
  assert.ok(b.wasteBlocks > a.wasteBlocks);
  assert.ok((b.cost?.grandTotal ?? 0) > (a.cost?.grandTotal ?? 0));
  const duplicate = { ...first, id: "copy", wastePercentage: "10" };
  assert.notEqual(validResult(calculateScenario(data, duplicate)).wasteBlocks, a.wasteBlocks);
  data.walls[0].length = "12";
  assert.ok(validResult(calculateScenario(data, first)).recommendedBlocks > a.recommendedBlocks);
  data.walls[0].length = String(convertLength(1200, "cm", "m"));
  assert.equal(validResult(calculateScenario(data, first)).recommendedBlocks, validResult(calculateScenario({ ...data, walls: [{ ...data.walls[0], length: "12" }] }, first)).recommendedBlocks);
  const usd = { ...first, id: "usd", currency: "USD" as const };
  assert.notEqual(validResult(calculateScenario(data, usd)).cost?.currency, validResult(calculateScenario(data, first)).cost?.currency);
});
