import type { VerificationStore } from "./verification-store.ts";
import {
  newRecord,
  validToken,
  publicRecord,
  type VerificationRecord,
} from "./verification.ts";
import {
  buildProjectDocument,
  type ProjectDocumentOptions,
} from "../features/calculator/lib/project-document.ts";
import {
  createDefaultProject,
  createRoom,
  createWall,
  createOpening,
} from "../features/calculator/lib/project-state.ts";
import type { CalculatorProjectData } from "../features/calculator/types/index.ts";

function matches(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) return Array.isArray(value);
  if (template !== null && typeof template === "object")
    return (
      !!value &&
      typeof value === "object" &&
      Object.entries(template).every(
        ([key, sample]) =>
          (["thickness", "thicknessUnit", "notes"].includes(key) &&
            (value as Record<string, unknown>)[key] === undefined) ||
          matches((value as Record<string, unknown>)[key], sample),
      )
    );
  return (
    typeof value === typeof template &&
    (typeof value !== "number" || Number.isFinite(value))
  );
}
export function validateProject(
  value: unknown,
): asserts value is CalculatorProjectData {
  const template = createDefaultProject();
  if (!matches(value, template)) throw new Error("Invalid project");
  const data = value as CalculatorProjectData;
  if (
    !["walls", "rooms"].includes(data.mode) ||
    !["IQD", "USD"].includes(data.settings.currency) ||
    !["custom", "library"].includes(data.settings.blockMode) ||
    !["quick", "advanced"].includes(data.settings.interfaceMode) ||
    !data.metadata.projectName.trim() ||
    data.rooms.length + data.walls.length > 1000
  )
    throw new Error("Invalid project");
  const openings = (items: unknown) => {
    if (
      !Array.isArray(items) ||
      items.length > 1000 ||
      !items.every((v) => matches(v, createOpening()))
    )
      throw new Error("Invalid openings");
  };
  for (const room of data.rooms) {
    if (!matches(room, createRoom())) throw new Error("Invalid room");
    openings(room.doors);
    openings(room.windows);
    for (const wall of room.walls) {
      if (!matches(wall, createRoom().walls[0]))
        throw new Error("Invalid wall");
      openings(wall.doors);
      openings(wall.windows);
      openings(wall.otherOpenings);
      openings(wall.structuralDeductions);
    }
  }
  for (const wall of data.walls) {
    if (!matches(wall, createWall())) throw new Error("Invalid wall");
    openings(wall.doors);
    openings(wall.windows);
  }
  if (data.scenarioComparison) {
    if (
      !Array.isArray(data.scenarioComparison.scenarios) ||
      data.scenarioComparison.scenarios.length > 100
    )
      throw new Error("Invalid scenarios");
    for (const s of data.scenarioComparison.scenarios) {
      if (
        !s ||
        typeof s.name !== "string" ||
        typeof s.wastePercentage !== "string" ||
        !s.customBlock ||
        !["IQD", "USD"].includes(s.currency)
      )
        throw new Error("Invalid scenario");
    }
  }
}
export function validateOptions(value: unknown): ProjectDocumentOptions {
  if (!value || typeof value !== "object") throw new Error("Invalid options");
  const v = value as Record<string, unknown>;
  if (
    !["estimate", "quotation", "detailed", "scenarios"].includes(String(v.kind))
  )
    throw new Error("Invalid kind");
  for (const k of [
    "notes",
    "terms",
    "preparedBy",
    "issuer",
    "contact",
    "validUntil",
  ])
    if (v[k] !== undefined && (typeof v[k] !== "string" || v[k].length > 8000))
      throw new Error("Invalid options");
  if (typeof v.issuer === "string" && v.issuer.length > 200)
    throw new Error("Invalid issuer");
  if (v.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(String(v.validUntil)))
    throw new Error("Invalid date");
  return {
    kind: v.kind as ProjectDocumentOptions["kind"],
    reference: "",
    issuedAt: "",
    notes: v.notes as string | undefined,
    terms: v.terms as string | undefined,
    preparedBy: v.preparedBy as string | undefined,
    validUntil: v.validUntil as string | undefined,
    issuer: v.issuer as string | undefined,
    contact: v.contact as string | undefined,
  };
}
export async function allocate(
  store: VerificationStore,
  kind: VerificationRecord["kind"],
) {
  const prefix = `${kind === "project" ? "BS" : kind === "quotation" ? "QT" : "RP"}-${new Date().getUTCFullYear()}`;
  return `${prefix}-${String(await store.next(prefix)).padStart(6, "0")}`;
}
export async function issueRecord(
  store: VerificationStore,
  projectId: string,
  data: CalculatorProjectData,
  options: ProjectDocumentOptions | null,
) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId))
    throw new Error("Invalid project ID");
  const existing = await store.list(projectId);
  let project = existing.find((r) => r.kind === "project");
  if (!project) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = await allocate(store, "project");
      const candidate = newRecord({
        kind: "project",
        projectId,
        projectReference: reference,
        documentReference: reference,
      });
      if (await store.create(candidate)) {
        project = candidate;
        break;
      }
      project = (await store.list(projectId)).find((r) => r.kind === "project");
      if (project) break;
    }
  }
  if (!project) throw new Error("Could not allocate identity");
  if (!options) return project;
  for (let attempt = 0; attempt < 5; attempt++) {
    const documentReference = await allocate(store, options.kind);
    const snapshot = buildProjectDocument(data, {
      ...options,
      reference: documentReference,
      issuedAt: new Date().toISOString(),
    });
    snapshot.project.reference = project.projectReference;
    const record = newRecord({
      kind: options.kind,
      projectId,
      projectReference: project.projectReference,
      documentReference,
      snapshot,
    });
    if (await store.create(record)) return record;
  }
  throw new Error("Could not allocate document");
}
export async function lookup(store: VerificationStore, token: string) {
  if (!validToken(token)) return null;
  const record = await store.get(token);
  return record ? publicRecord(record) : null;
}
