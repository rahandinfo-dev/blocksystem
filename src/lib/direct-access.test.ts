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
