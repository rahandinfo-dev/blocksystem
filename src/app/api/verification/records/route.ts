import { authorized, limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
import {
  issueRecord,
  validateOptions,
  validateProject,
} from "@/lib/verification-service";
import {
  validToken,
  verificationOrigin,
  verificationUrl,
} from "@/lib/verification";
import { auditEvent, requestFingerprint } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { apiError, apiHeaders } from "@/lib/observability";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!authorized(request))
      return apiError("UNAUTHORIZED", 401, request);
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId))
      return apiError("VALIDATION_ERROR", 400, request);
    const origin = verificationOrigin();
    const records = await store.list(projectId);
    return Response.json(
      records.map((r) => ({
        ...r,
        url: verificationUrl(origin, r.verificationToken),
      })),
      { headers: apiHeaders(request) },
    );
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return apiError("UNAUTHORIZED", 401, request);
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const origin = verificationOrigin();
    const body = (await limitedJson(request)) as {
      projectId?: unknown;
      data?: unknown;
      options?: unknown;
      projectOnly?: unknown;
    };
    if (typeof body.projectId !== "string")
      return apiError("VALIDATION_ERROR", 400, request);
    try {
      validateProject(body.data);
      const options =
        body.projectOnly === true ? null : validateOptions(body.options);
      const record = await issueRecord(
        store,
        body.projectId,
        body.data,
        options,
      );
      await store.appendAudit(
        auditEvent({
          action: "verification.created",
          entityType: options ? "document" : "project",
          entityReference: record.documentReference,
          result: "success",
          context: { kind: record.kind, request: requestFingerprint(request) },
        }),
      );
      return Response.json(
        { ...record, url: verificationUrl(origin, record.verificationToken) },
        { status: 201, headers: apiHeaders(request) },
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid"))
        return apiError("VALIDATION_ERROR", 400, request);
      throw error;
    }
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return apiError("UNAUTHORIZED", 401, request);
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "revoke")))
      return apiError("RATE_LIMITED", 429, request, { "Retry-After": "60" });
    const body = (await limitedJson(request)) as { token?: unknown };
    if (typeof body.token !== "string" || !validToken(body.token))
      return apiError("VALIDATION_ERROR", 400, request);
    const record = await store.revoke(body.token);
    if (record)
      await store.appendAudit(
        auditEvent({
          action: "verification.revoked",
          entityType: "verification",
          entityReference: record.documentReference,
          result: "success",
          context: { request: requestFingerprint(request) },
        }),
      );
    if (!record) return apiError("NOT_FOUND", 404, request);
    return Response.json({ ok: true }, { headers: apiHeaders(request) });
  } catch (error) {
    safeServerError(error, request);
    return apiError("DEPENDENCY_UNAVAILABLE", 503, request);
  }
}
