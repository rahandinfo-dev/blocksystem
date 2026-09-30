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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (!authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId))
      return Response.json({ error: "invalid" }, { status: 400 });
    const origin = verificationOrigin();
    const records = await verificationStore().list(projectId);
    return Response.json(
      records.map((r) => ({
        ...r,
        url: verificationUrl(origin, r.verificationToken),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
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
        verificationStore(),
        body.projectId,
        body.data,
        options,
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
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const body = (await limitedJson(request)) as { token?: unknown };
    if (typeof body.token !== "string" || !validToken(body.token))
      return Response.json({ error: "invalid" }, { status: 400 });
    const record = await verificationStore().revoke(body.token);
    return Response.json(
      { ok: !!record },
      { status: record ? 200 : 404, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
