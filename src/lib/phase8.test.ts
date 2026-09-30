import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditEvent, safeAuditContext } from "./audit.ts";
import { verificationEnvironment } from "./server-env.ts";
import { FileVerificationStore } from "./verification-store.ts";
import {
  createWorkspaceBackup,
  validateWorkspaceBackup,
} from "./workspace-backup.ts";
import { createDefaultProject } from "../features/calculator/lib/project-state.ts";
import { migrateSavedProject, projectSchemaVersion } from "./project-schema.ts";
import { phase8Messages } from "./phase8-messages.ts";

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: "https://redis.example.test",
    UPSTASH_REDIS_REST_TOKEN: "a".repeat(40),
    VERIFICATION_ADMIN_SECRET: "b".repeat(40),
    VERIFICATION_PUBLIC_ORIGIN: "https://verify.example.test",
    ...overrides,
  } as NodeJS.ProcessEnv;
}
test("production environment validation rejects public secrets and unsafe URLs", () => {
  assert.equal(
    verificationEnvironment(environment()).publicOrigin,
    "https://verify.example.test",
  );
  for (const env of [
    environment({ UPSTASH_REDIS_REST_URL: "http://redis.example.test" }),
    environment({
      VERIFICATION_PUBLIC_ORIGIN: "https://verify.example.test/path",
    }),
    environment({ VERIFICATION_ADMIN_SECRET: "short" }),
    environment({ NEXT_PUBLIC_VERIFICATION_ADMIN_SECRET: "leak" }),
    environment({ UPSTASH_REDIS_REST_TOKEN: undefined }),
  ])
    assert.throws(() => verificationEnvironment(env));
});
test("append-only audit filtering and persistent rate limits exclude sensitive material", async () => {
  const store = new FileVerificationStore(
    await mkdtemp(join(tmpdir(), "blocksystem-phase8-")),
  );
  const event = auditEvent({
    action: "verification.created",
    entityType: "document",
    entityReference: "QT-2026-000001",
    result: "success",
    context: {
      password: "no",
      verificationToken: "no",
      clientName: "no",
      kind: "quotation",
      count: 1,
    },
  });
  assert.deepEqual(
    {
      ...safeAuditContext({
        password: "no",
        token: "no",
        kind: "quotation",
        enabled: true,
      }),
    },
    { kind: "quotation", enabled: true },
  );
  await store.appendAudit(event);
  const events = await new FileVerificationStore(
    (store as unknown as { directory: string }).directory,
  ).listAudit(10);
  assert.equal(events.length, 1);
  assert.equal(events[0].context?.kind, "quotation");
  assert.ok(
    !JSON.stringify(events).match(/password|verificationToken|clientName/i),
  );
  assert.equal(await store.rateLimit("public:test", 2, 60), true);
  assert.equal(await store.rateLimit("public:test", 2, 60), true);
  assert.equal(await store.rateLimit("public:test", 2, 60), false);
});
test("versioned backups strip verification tokens and reject malformed, unsafe and duplicate data", () => {
  const data = createDefaultProject();
  data.metadata.projectName = "Backup test";
  const project = {
    version: projectSchemaVersion,
    id: "project-12345678-abcd",
    name: "Backup test",
    createdAt: "2026-01-01T00:00:00.000Z",
    savedAt: "2026-01-01T00:00:00.000Z",
    data: {
      ...data,
      identity: {
        publicReference: "BS-2026-000001",
        verificationToken: "private-token",
      },
    },
    calculationEngineVersion: "2.2.0",
  } as const;
  const backup = createWorkspaceBackup({
    projects: [project],
    favorites: [project.id],
    preferences: { autosave: true, quickActions: ["new", "save"] },
    activity: [],
  });
  assert.equal(JSON.stringify(backup).includes("private-token"), false);
  const restored = validateWorkspaceBackup(backup);
  assert.equal(restored.data.projects.length, 1);
  assert.equal(restored.data.projects[0].data.identity, undefined);
  assert.throws(() => validateWorkspaceBackup({ ...backup, version: 2 }));
  assert.throws(() =>
    validateWorkspaceBackup(
      JSON.parse(
        '{"format":"blocksystem-backup","version":1,"createdAt":"x","data":{"__proto__":{"polluted":true},"projects":[],"favorites":[],"preferences":{},"activity":[]}}',
      ),
    ),
  );
  assert.throws(() =>
    validateWorkspaceBackup({
      ...backup,
      data: { ...backup.data, projects: [project, project] },
    }),
  );
});
test("schema migration retains legacy valid projects while rejecting invalid saved envelopes", () => {
  const data = createDefaultProject();
  const migrated = migrateSavedProject({
    id: "project-abc1234567",
    version: 1,
    savedAt: "2020-01-01T00:00:00.000Z",
    data,
  });
  assert.ok(migrated);
  assert.equal(migrated?.version, projectSchemaVersion);
  assert.equal(migrateSavedProject({ id: "", data: {} }), null);
});
test("Phase 8 strings are complete for KU/AR/EN-GB", () => {
  const keys = Object.keys(phase8Messages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(
      Object.keys(phase8Messages[language]).sort(),
      [...keys].sort(),
    );
    assert.ok(
      keys.every(
        (key) =>
          phase8Messages[language][
            key as keyof (typeof phase8Messages)["en-GB"]
          ].trim().length > 0,
      ),
    );
  }
});
