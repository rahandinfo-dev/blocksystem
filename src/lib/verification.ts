import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ProjectDocumentData } from "../features/calculator/lib/project-document.ts";

export interface VerificationRecord {
  documentId: string;
  documentReference: string;
  projectId: string;
  projectReference: string;
  kind: "project" | ProjectDocumentData["kind"];
  verificationToken: string;
  fingerprint: string;
  createdAt: string;
  status: "valid" | "revoked";
  revokedAt?: string;
  snapshot?: ProjectDocumentData;
}
export type PublicVerification = Pick<
  VerificationRecord,
  | "documentReference"
  | "projectReference"
  | "kind"
  | "fingerprint"
  | "createdAt"
  | "status"
  | "revokedAt"
>;
export const validToken = (token: string) => /^[a-f0-9]{48}$/.test(token);
export function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value)
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  throw new Error("Invalid fingerprint input");
}
export const fingerprint = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export const token = () => randomBytes(24).toString("hex");
export function newRecord(
  input: Pick<
    VerificationRecord,
    "kind" | "projectId" | "projectReference" | "documentReference" | "snapshot"
  >,
): VerificationRecord {
  return {
    ...input,
    documentId: randomUUID(),
    verificationToken: token(),
    fingerprint: fingerprint(
      input.snapshot ?? { projectReference: input.projectReference },
    ),
    createdAt: new Date().toISOString(),
    status: "valid",
  };
}
export function publicRecord(record: VerificationRecord): PublicVerification {
  return {
    status: record.status,
    documentReference: record.documentReference,
    projectReference: record.projectReference,
    kind: record.kind,
    createdAt: record.createdAt,
    fingerprint: record.fingerprint,
    ...(record.revokedAt ? { revokedAt: record.revokedAt } : {}),
  };
}
export function verificationOrigin() {
  const configured = process.env.VERIFICATION_PUBLIC_ORIGIN;
  if (!configured) throw new Error("Verification origin unavailable");
  const url = new URL(configured);
  const local =
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid verification origin");
  return url.origin;
}
export function verificationUrl(origin: string, value: string) {
  if (!validToken(value)) throw new Error("Invalid token");
  return `${origin}/verify/${value}`;
}
