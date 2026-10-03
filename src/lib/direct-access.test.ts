import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts: string[]) => join(root, "src", ...parts);

test("the root renders the application directly without an account provider or redirect", async () => {
  const [page, layout, home] = await Promise.all([
    readFile(source("app", "page.tsx"), "utf8"),
    readFile(source("app", "layout.tsx"), "utf8"),
    readFile(source("components", "layout", "home-content.tsx"), "utf8"),
  ]);
  assert.match(page, /HomeContent/);
  assert.doesNotMatch(layout, /AuthProvider|auth-provider/);
  assert.doesNotMatch(home, /ServerProjectSync|server-project-sync/);
});

test("projects stay private to the current device and retain local history", async () => {
  const storage = await readFile(source("lib", "project-storage.ts"), "utf8");
  assert.match(storage, /localStorage/);
  assert.match(storage, /versionsKey/);
  assert.match(storage, /downloadWorkspaceBackup/);
  assert.doesNotMatch(storage, /api\/projects|server-project/);
});

test("no account routes or account API endpoints remain", async () => {
  const removed = [
    source("app", "login", "page.tsx"),
    source("app", "signup", "page.tsx"),
    source("app", "forgot-password", "page.tsx"),
    source("app", "reset-password", "page.tsx"),
    source("app", "api", "auth", "session", "route.ts"),
    source("app", "api", "auth", "register", "route.ts"),
  ];
  for (const file of removed)
    await assert.rejects(access(file, constants.F_OK));
});

test("document verification routes, APIs, and UI components are absent", async () => {
  const removed = [
    source("app", "verify", "[token]", "page.tsx"),
    source("app", "api", "verification", "records", "route.ts"),
    source("app", "api", "verification", "session", "route.ts"),
    source("app", "api", "verification", "public", "[token]", "route.ts"),
    source("app", "api", "project-documents", "route.ts"),
    source("features", "calculator", "components", "project-documents.tsx"),
    source("features", "calculator", "components", "project-qr.tsx"),
  ];
  for (const file of removed)
    await assert.rejects(access(file, constants.F_OK));

  const calculator = await readFile(
    source("features", "calculator", "components", "calculator.tsx"),
    "utf8",
  );
  assert.doesNotMatch(calculator, /ProjectDocuments|verification|certificate/i);
});

test("engineering import workspace is absent and the 2D plan uses an on-demand preview", async () => {
  const removed = [
    source("features", "calculator", "components", "engineering-takeoff.tsx"),
    source("features", "calculator", "lib", "engineering-takeoff.ts"),
    source("lib", "phase13-messages.ts"),
  ];
  for (const file of removed)
    await assert.rejects(access(file, constants.F_OK));

  const [calculator, plan] = await Promise.all([
    readFile(source("features", "calculator", "components", "calculator.tsx"), "utf8"),
    readFile(source("features", "calculator", "components", "floor-plan-workspace.tsx"), "utf8"),
  ]);
  assert.match(calculator, /FloorPlanPreview/);
  assert.doesNotMatch(calculator, /EngineeringTakeoff|engineering-takeoff/);
  assert.match(plan, /data-plan-preview-open/);
  assert.match(plan, /open \? \(/);
  assert.match(plan, /data-preview-close/);
  assert.match(plan, /<FloorPlanWorkspace data=\{data\} onChange=\{onChange\}/);
  assert.match(plan, /plan\.measure|plan\.export|plan\.print|plan\.fullscreen/);
});

test("engineering fields use the shared compound control and responsive sticky-result rules", async () => {
  const [lengthField, blockField, openings, styles] = await Promise.all([
    readFile(source("components", "ui", "length-field.tsx"), "utf8"),
    readFile(source("components", "ui", "block-dimension-field.tsx"), "utf8"),
    readFile(source("features", "calculator", "components", "openings-section.tsx"), "utf8"),
    readFile(source("app", "globals.css"), "utf8"),
  ]);
  assert.match(lengthField, /compound-field__value/);
  assert.match(blockField, /compound-field__unit/);
  assert.match(openings, /opening-fields/);
  assert.match(styles, /--unit-lane/);
  assert.match(styles, /@media \(max-width: 1023px\) \{ \.result-panel \{ position: static/);
});

test("calculation results have persistent desktop and mobile presentation paths", async () => {
  const [calculator, results, styles] = await Promise.all([
    readFile(source("features", "calculator", "components", "calculator.tsx"), "utf8"),
    readFile(source("features", "calculator", "components", "results-dashboard.tsx"), "utf8"),
    readFile(source("app", "globals.css"), "utf8"),
  ]);
  assert.match(calculator, /result-panel-slot/);
  assert.match(results, /mobile-results-toggle/);
  assert.match(results, /data-mobile-expanded/);
  assert.match(styles, /@media \(min-width: 1024px\)/);
  assert.match(styles, /position: fixed/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /@media print/);
});
