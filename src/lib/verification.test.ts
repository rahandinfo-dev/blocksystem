import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  canonical,
  fingerprint,
  newRecord,
  token,
  validToken,
  verificationOrigin,
  verificationUrl,
  publicRecord,
} from "./verification.ts";
import {
  FileVerificationStore,
  verificationStore,
} from "./verification-store.ts";
import {
  issueRecord,
  lookup,
  validateProject,
  validateOptions,
} from "./verification-service.ts";
import {
  authorized,
  passwordMatches,
  sessionCookie,
  sameOrigin,
} from "./verification-auth.ts";
import { createDefaultProject } from "../features/calculator/lib/project-state.ts";
import { buildProjectDocument } from "../features/calculator/lib/project-document.ts";
import { documentSections } from "../features/calculator/lib/document-presentation.ts";
import { documentMessages } from "./document-messages.ts";
import { migrateSavedProject } from "./project-schema.ts";
import { pdfTextRuns } from "../features/calculator/lib/pdf-bidi.ts";

function fixture() {
  const data = createDefaultProject();
  data.metadata.projectName = "Private project";
  data.metadata.clientName = "PRIVATE CLIENT";
  Object.assign(data.rooms[0], { length: "5", width: "4", height: "3" });
  data.settings.unitPrice = "1000";
  return data;
}
const options = {
  kind: "quotation" as const,
  reference: "QT-2026-000001",
  issuedAt: "2026-09-30T12:00:00.000Z",
  notes: "Private notes",
};
test("cryptographic tokens and canonical deterministic SHA-256", () => {
  const values = new Set(Array.from({ length: 1000 }, token));
  assert.equal(values.size, 1000);
  for (const v of values) assert.ok(validToken(v));
  for (const v of [
    "",
    "a".repeat(47),
    "A".repeat(48),
    "../secret",
    "1",
    "a".repeat(49),
  ])
    assert.equal(validToken(v), false);
  assert.equal(
    canonical({ b: 2, a: { z: 3, y: 1 }, none: undefined }),
    '{"a":{"y":1,"z":3},"b":2}',
  );
  assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }));
  assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
  assert.throws(() => fingerprint(NaN));
  const doc = buildProjectDocument(fixture(), options);
  assert.equal(fingerprint(doc), fingerprint(JSON.parse(JSON.stringify(doc))));
  assert.match(fingerprint(doc), /^[0-9a-f]{64}$/);
});
test("persistent immutable documents, collision retry, concurrent project initialization and revocation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blocksystem-records-"));
  const store = new FileVerificationStore(directory);
  const data = fixture();
  const projects = await Promise.all(
    Array.from({ length: 8 }, () =>
      issueRecord(store, "legacy-project", data, null),
    ),
  );
  assert.equal(new Set(projects.map((p) => p.verificationToken)).size, 1);
  assert.match(projects[0].projectReference, /^BS-\d{4}-\d{6}$/);
  const records = await Promise.all(
    Array.from({ length: 6 }, () =>
      issueRecord(store, "legacy-project", data, options),
    ),
  );
  assert.equal(new Set(records.map((r) => r.documentReference)).size, 6);
  assert.equal(new Set(records.map((r) => r.documentId)).size, 6);
  assert.ok(
    records.every((r) => r.projectReference === projects[0].projectReference),
  );
  assert.notEqual(records[0].verificationToken, projects[0].verificationToken);
  assert.equal(await store.create(records[0]), false);
  assert.equal(
    await store.create({ ...records[0], verificationToken: token() }),
    false,
  );
  const create = store.create.bind(store);
  let rejected = false;
  store.create = async (r) => {
    if (!rejected) {
      rejected = true;
      return false;
    }
    return create(r);
  };
  const retry = await issueRecord(store, "legacy-project", data, options);
  assert.ok(rejected);
  assert.match(retry.documentReference, /^QT-\d{4}-\d{6}$/);
  const reopened = new FileVerificationStore(directory);
  const saved = await reopened.get(records[0].verificationToken);
  assert.deepEqual(saved, JSON.parse(JSON.stringify(records[0])));
  data.metadata.clientName = "Changed later";
  assert.equal(saved?.snapshot?.project.client, "PRIVATE CLIENT");
  const safe = await lookup(reopened, records[0].verificationToken);
  assert.equal(safe?.status, "valid");
  assert.ok(!JSON.stringify(safe).includes("PRIVATE CLIENT"));
  assert.ok(!("snapshot" in safe!));
  assert.ok(!("projectId" in safe!));
  assert.equal(await lookup(reopened, token()), null);
  assert.equal(
    await lookup(
      {
        get: () => {
          throw new Error("must not query");
        },
      } as unknown as FileVerificationStore,
      "bad",
    ),
    null,
  );
  const revoked = await reopened.revoke(records[0].verificationToken);
  assert.equal(revoked?.status, "revoked");
  assert.ok(revoked?.revokedAt);
  assert.equal(revoked?.fingerprint, saved?.fingerprint);
  assert.deepEqual(
    await reopened.revoke(records[0].verificationToken),
    revoked,
  );
  assert.equal(
    (
      await lookup(
        new FileVerificationStore(directory),
        records[0].verificationToken,
      )
    )?.status,
    "revoked",
  );
});
test("explicit trusted origins and fail-closed production persistence", () => {
  const old = { ...process.env };
  try {
    delete process.env.VERCEL;
    process.env = { ...process.env, NODE_ENV: "development" };
    process.env.VERIFICATION_PUBLIC_ORIGIN = "https://verify.example.test";
    const t = token();
    assert.equal(
      verificationUrl(verificationOrigin(), t),
      `https://verify.example.test/verify/${t}`,
    );
    assert.throws(() => verificationUrl("https://verify.example.test", "bad"));
    for (const origin of [
      "http://example.com",
      "https://name:password@example.com",
      "https://example.com/path",
      "https://example.com/?a=1",
      "ftp://localhost",
      "https://example.com/#hash",
    ]) {
      process.env.VERIFICATION_PUBLIC_ORIGIN = origin;
      assert.throws(verificationOrigin);
    }
    process.env.VERIFICATION_PUBLIC_ORIGIN = "http://localhost:3010";
    assert.equal(verificationOrigin(), "http://localhost:3010");
    process.env = { ...process.env, NODE_ENV: "production" };
    assert.throws(verificationOrigin);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.VERIFICATION_DEV_DIRECTORY = tmpdir();
    assert.throws(verificationStore);
  } finally {
    process.env = old;
  }
});
test("protected administration, signed cookies, cross-origin rejection", () => {
  const old = process.env.VERIFICATION_ADMIN_SECRET;
  process.env.VERIFICATION_ADMIN_SECRET = "test-only-".repeat(5);
  try {
    assert.ok(passwordMatches(process.env.VERIFICATION_ADMIN_SECRET));
    assert.equal(passwordMatches("wrong"), false);
    const cookie = sessionCookie().split(";")[0];
    assert.ok(sessionCookie().includes("HttpOnly; SameSite=Strict"));
    assert.ok(
      authorized(new Request("https://example.com", { headers: { cookie } })),
    );
    assert.equal(
      authorized(
        new Request("https://example.com", {
          headers: { cookie: cookie + "0" },
        }),
      ),
      false,
    );
    assert.equal(authorized(new Request("https://example.com")), false);
    assert.ok(
      sameOrigin(
        new Request("https://example.com/api", {
          headers: { origin: "https://example.com" },
        }),
      ),
    );
    assert.equal(
      sameOrigin(
        new Request("https://example.com/api", {
          headers: { origin: "https://evil.com" },
        }),
      ),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.VERIFICATION_ADMIN_SECRET;
    else process.env.VERIFICATION_ADMIN_SECRET = old;
  }
});
test("legacy identity and saved document settings survive migration", () => {
  const data = fixture();
  data.identity = {
    publicReference: "BS-2025-000123",
    verificationToken: "old-token",
  };
  data.documentSettings = {
    kind: "quotation",
    notes: "Keep these",
    issuer: "Issuer",
  };
  const migrated = migrateSavedProject({
    id: "original-internal-id",
    version: 1,
    data,
  });
  assert.equal(migrated?.id, "original-internal-id");
  assert.deepEqual(migrated?.data.identity, data.identity);
  assert.equal(migrated?.data.documentSettings?.notes, "Keep these");
  validateProject(migrated?.data);
  assert.doesNotThrow(() => buildProjectDocument(migrated!.data, options));
  assert.throws(() => validateProject({}));
  assert.throws(() => validateOptions({ kind: "fake" }));
});
test("complete KU/AR/EN-GB dictionaries and language-independent snapshots", () => {
  const doc = buildProjectDocument(fixture(), options);
  const before = fingerprint(doc);
  const keys = Object.keys(documentMessages["en-GB"]);
  for (const language of ["ku", "ar", "en-GB"] as const) {
    assert.deepEqual(
      Object.keys(documentMessages[language]).sort(),
      [...keys].sort(),
    );
    for (const key of keys)
      assert.ok(
        documentMessages[language][
          key as keyof (typeof documentMessages)["en-GB"]
        ].length > 0,
      );
    const rows = documentSections(doc, language);
    assert.ok(rows.length >= 3);
    assert.equal(fingerprint(doc), before);
    if (language !== "en-GB") assert.match(rows[0].title, /[\u0600-\u06ff]/);
  }
  const record = newRecord({
    kind: "quotation",
    projectId: "private-id",
    projectReference: "BS-2026-000001",
    documentReference: options.reference,
    snapshot: doc,
  });
  assert.deepEqual(
    Object.keys(publicRecord(record)).sort(),
    [
      "status",
      "documentReference",
      "projectReference",
      "kind",
      "createdAt",
      "fingerprint",
    ].sort(),
  );
});
test("Unicode bidi preserves Latin references and positions mirrored punctuation around RTL text", () => {
  assert.equal(pdfTextRuns("QT-2026-000001", "rtl").join(""), "QT-2026-000001");
  const runs = pdfTextRuns("نرخ (زیادە)", "rtl");
  assert.equal(runs[0], "(");
  assert.equal(runs[1], "زیادە");
  assert.equal(runs[2], ")");
  assert.equal(runs.at(-1), "نرخ");
  assert.ok(pdfTextRuns("54 m²", "ltr").includes("²"));
});
