import { applicationVersion } from "./app-version.ts";
import { log } from "./observability.ts";
import { verificationEnvironment } from "./server-env.ts";
import { verificationStore } from "./verification-store.ts";

export type HealthState = "ok" | "degraded" | "unready" | "unknown";
export type HealthReport = {
  status: HealthState;
  timestamp: string;
  version: string;
  services: { application: "ok"; verification: "ok" | "unavailable" | "not_configured" };
};

export function liveness(): HealthReport {
  return { status: "ok", timestamp: new Date().toISOString(), version: applicationVersion, services: { application: "ok", verification: "not_configured" } };
}
async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function readiness(): Promise<HealthReport> {
  const report = liveness();
  let config: ReturnType<typeof verificationEnvironment>;
  try {
    config = verificationEnvironment();
  } catch {
    return { ...report, status: "unready", services: { ...report.services, verification: "not_configured" } };
  }
  if (!config.redisUrl && !process.env.VERIFICATION_DEV_DIRECTORY)
    return { ...report, status: "unready", services: { ...report.services, verification: "not_configured" } };
  try {
    await bounded(verificationStore().ping(), 2500);
    return { ...report, status: "ok", services: { ...report.services, verification: "ok" } };
  } catch (error) {
    log("warn", "health.verification_unavailable", { error: error instanceof Error ? error.name : "UnknownError" });
    return { ...report, status: "degraded", services: { ...report.services, verification: "unavailable" } };
  }
}
