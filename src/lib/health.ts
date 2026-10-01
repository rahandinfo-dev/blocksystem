import { applicationVersion } from "./app-version.ts";

export type HealthState = "ok";
export type HealthReport = {
  status: HealthState;
  timestamp: string;
  version: string;
  services: { application: "ok" };
};

export function liveness(): HealthReport {
  return { status: "ok", timestamp: new Date().toISOString(), version: applicationVersion, services: { application: "ok" } };
}
export async function readiness(): Promise<HealthReport> {
  return liveness();
}
