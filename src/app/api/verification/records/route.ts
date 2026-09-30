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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId))
      return Response.json({ error: "invalid" }, { status: 400 });
    const origin = verificationOrigin();
    const records = await store.list(projectId);
    return Response.json(
      records.map((r) => ({
        ...r,
        url: verificationUrl(origin, r.verificationToken),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    safeServerError(error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "admin")))
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const origin = verificationOrigin();
    const body = (await limitedJson(request)) as {
      projectId?: unknown;
      data?: unknown;
      options?: unknown;
      projectOnly?: unknown;
    };
    if (typeof body.projectId !== "string")
      return Response.json({ error: "invalid" }, { status: 400 });
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
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid"))
        return Response.json({ error: "invalid" }, { status: 400 });
      throw error;
    }
  } catch (error) {
    safeServerError(error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "revoke")))
      return Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const body = (await limitedJson(request)) as { token?: unknown };
    if (typeof body.token !== "string" || !validToken(body.token))
      return Response.json({ error: "invalid" }, { status: 400 });
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
    return Response.json(
      { ok: !!record },
      { status: record ? 200 : 404, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    safeServerError(error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
